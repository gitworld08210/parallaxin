// Generate postpaid ad invoices for advertisers whose billing cycle has closed,
// or on-demand for a specific advertiser. Emails the branded invoice.
//
// POST body (all optional):
//   { advertiser_id?: string, force?: boolean }
// Cron calls it with no body and processes every eligible postpaid advertiser.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtRange(a: Date, b: Date) {
  return `${fmtDate(a)} – ${fmtDate(b)}`
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }

function cycleDays(cycle: string, custom?: number | null) {
  if (cycle === 'weekly') return 7
  if (cycle === '15d') return 15
  if (cycle === 'custom' && custom) return custom
  return 30
}

async function nextInvoiceNumber(admin: any, when: Date) {
  const yyyy = when.getUTCFullYear()
  const mm = String(when.getUTCMonth() + 1).padStart(2, '0')
  const prefix = `INV-${yyyy}-${mm}-`
  const { count } = await admin
    .from('aap_invoices')
    .select('id', { count: 'exact', head: true })
    .ilike('invoice_number', `${prefix}%`)
  const seq = String((count ?? 0) + 1).padStart(5, '0')
  return `${prefix}${seq}`
}

async function generateForAdvertiser(admin: any, advertiserId: string, force = false) {
  const { data: adv } = await admin.from('aap_advertisers').select('*').eq('id', advertiserId).maybeSingle()
  if (!adv) return { advertiser_id: advertiserId, skipped: 'not_found' }
  if (adv.billing_mode !== 'postpaid_invoice' && !force) return { advertiser_id: advertiserId, skipped: 'not_postpaid' }

  const { data: acct } = await admin.from('aap_postpaid_accounts').select('*').eq('advertiser_id', advertiserId).maybeSingle()
  if (!acct && !force) return { advertiser_id: advertiserId, skipped: 'no_postpaid_account' }

  const days = cycleDays(acct?.billing_cycle ?? '30d', acct?.custom_cycle_days)
  const now = new Date()
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const periodStart = addDays(periodEnd, -days)

  // Skip if an invoice already covers this period end
  const { data: existing } = await admin.from('aap_invoices').select('id')
    .eq('advertiser_id', advertiserId)
    .gte('period_end', periodStart.toISOString().slice(0, 10))
    .maybeSingle()
  if (existing && !force) return { advertiser_id: advertiserId, skipped: 'invoice_exists' }

  const { data: campaigns } = await admin.from('aap_campaigns')
    .select('id, name, spent')
    .eq('advertiser_id', advertiserId)
    .gt('spent', 0)

  const subtotal = (campaigns ?? []).reduce((s: number, c: any) => s + Number(c.spent ?? 0), 0)
  if (subtotal <= 0 && !force) return { advertiser_id: advertiserId, skipped: 'no_spend' }

  const taxRate = Number(acct?.tax_rate ?? 18)
  const tax = +(subtotal * (taxRate / 100)).toFixed(2)
  const total = +(subtotal + tax).toFixed(2)
  const dueDate = addDays(periodEnd, 30)
  const invoiceNumber = await nextInvoiceNumber(admin, periodEnd)

  const { data: invoice, error: invErr } = await admin.from('aap_invoices').insert({
    advertiser_id: advertiserId,
    invoice_number: invoiceNumber,
    period_start: periodStart.toISOString().slice(0, 10),
    period_end: periodEnd.toISOString().slice(0, 10),
    subtotal, tax, total,
    currency: adv.currency ?? 'INR',
    status: 'issued',
    issued_at: new Date().toISOString(),
    due_at: dueDate.toISOString(),
  }).select().single()
  if (invErr) throw invErr

  if ((campaigns ?? []).length) {
    await admin.from('aap_invoice_lines').insert(campaigns.map((c: any) => ({
      invoice_id: invoice.id,
      campaign_id: c.id,
      description: c.name,
      quantity: 1,
      unit_price: Number(c.spent),
      amount: Number(c.spent),
    })))
  }

  // Billing profile
  const { data: bp } = await admin.from('aap_billing_profiles').select('*')
    .eq('advertiser_id', advertiserId).eq('is_default', true).maybeSingle()
  const recipient = bp?.billing_email
  if (!recipient) {
    return { advertiser_id: advertiserId, invoice_number: invoiceNumber, warning: 'no_billing_email' }
  }

  const address = [bp?.address_line1, bp?.address_line2, [bp?.city, bp?.state, bp?.postal_code].filter(Boolean).join(', '), bp?.country].filter(Boolean).join('\n')

  const templateData = {
    invoiceNumber,
    billTo: { name: bp?.billing_name || adv.legal_name || adv.display_name, address, gstin: bp?.gstin, email: recipient },
    billingCycle: fmtRange(periodStart, periodEnd),
    invoiceDate: fmtDate(new Date()),
    dueDate: fmtDate(dueDate),
    currency: adv.currency ?? 'INR',
    lines: (campaigns ?? []).map((c: any) => ({ description: c.name, ad_account: adv.display_name, amount: Number(c.spent) })),
    subtotal, taxRate, taxAmount: tax, total, amountDue: total,
    invoiceUrl: `https://parallaxai.in/ads/${advertiserId}/billing`,
  }

  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({
      templateName: 'aap-invoice',
      recipientEmail: recipient,
      idempotencyKey: `aap-invoice-${invoice.id}`,
      templateData,
    }),
  })
  const sendJson = await sendRes.json().catch(() => ({}))

  return { advertiser_id: advertiserId, invoice_number: invoiceNumber, total, emailed: sendRes.ok, send: sendJson }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const body = await req.json().catch(() => ({} as any))

    if (body?.advertiser_id) {
      const r = await generateForAdvertiser(admin, body.advertiser_id, !!body.force)
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: postpaid } = await admin.from('aap_postpaid_accounts').select('advertiser_id').eq('status', 'active')
    const results = []
    for (const p of postpaid ?? []) {
      try {
        results.push(await generateForAdvertiser(admin, p.advertiser_id))
      } catch (e: any) {
        results.push({ advertiser_id: p.advertiser_id, error: e?.message ?? String(e) })
      }
    }
    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('aap-generate-invoices failed', e)
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
