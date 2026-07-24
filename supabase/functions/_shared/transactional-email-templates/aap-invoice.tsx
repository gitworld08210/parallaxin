/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, brand, Hr } from './_layout.tsx'

interface Line {
  description: string
  ad_account?: string
  impressions?: number | string
  clicks?: number | string
  amount: number | string
}

interface Props {
  invoiceNumber: string
  billTo: {
    name: string
    address?: string
    gstin?: string
    email?: string
  }
  billingCycle: string
  invoiceDate: string
  dueDate: string
  currency?: string
  lines: Line[]
  subtotal: string
  taxRate?: number
  taxAmount: string
  total: string
  amountDue: string
  invoiceUrl?: string
  paymentInstructions?: string
}

const fmtNum = (n: number | string | undefined) =>
  n === undefined || n === null ? '—' : typeof n === 'number' ? n.toLocaleString('en-IN') : n

const money = (n: string | number, currency = 'INR') =>
  `${currency === 'INR' ? '₹' : currency + ' '}${typeof n === 'number' ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : n}`

const th: React.CSSProperties = { textAlign: 'left', color: brand.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', padding: '10px 12px', borderBottom: `1px solid ${brand.hairline}` }
const td: React.CSSProperties = { color: brand.ink, fontSize: '13px', padding: '10px 12px', borderBottom: `1px solid ${brand.hairline}`, verticalAlign: 'top' }
const tdR: React.CSSProperties = { ...td, textAlign: 'right' }
const thR: React.CSSProperties = { ...th, textAlign: 'right' }

const Email = ({
  invoiceNumber, billTo, billingCycle, invoiceDate, dueDate, currency = 'INR',
  lines, subtotal, taxRate = 18, taxAmount, total, amountDue,
  invoiceUrl, paymentInstructions,
}: Props) => (
  <AurelixLayout
    kicker="AURELIX ADS · TAX INVOICE"
    preview={`Invoice ${invoiceNumber} · ${money(amountDue, currency)} due ${dueDate}`}
  >
    <div style={{ textAlign: 'center', marginBottom: '18px' }}>
      <div style={{ display: 'inline-block', border: `1px solid ${brand.gold}`, color: brand.navy, fontSize: '10px', letterSpacing: '2px', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>TAX INVOICE</div>
      <Heading style={{ ...styles.h1, fontSize: '28px', margin: '10px 0 4px 0', letterSpacing: '2px' }}>INVOICE</Heading>
      <Text style={{ ...styles.muted, color: brand.navy, fontWeight: 600, margin: 0 }}># {invoiceNumber}</Text>
    </div>

    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: '18px' }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'top', paddingRight: '12px', width: '50%' }}>
            <div style={styles.metaLabel}>Bill To</div>
            <Text style={{ ...styles.p, margin: '4px 0 2px', fontWeight: 700 }}>{billTo.name}</Text>
            {billTo.address && <Text style={{ ...styles.muted, whiteSpace: 'pre-line', margin: '2px 0' }}>{billTo.address}</Text>}
            {billTo.gstin && <Text style={{ ...styles.muted, margin: '2px 0' }}>GSTIN: {billTo.gstin}</Text>}
            {billTo.email && <Text style={{ ...styles.muted, margin: '2px 0' }}>{billTo.email}</Text>}
          </td>
          <td style={{ verticalAlign: 'top', width: '50%' }}>
            <div style={styles.metaLabel}>Billing Details</div>
            <div style={{ ...styles.metaRow, marginTop: '4px' }}><span style={{ color: brand.muted }}>Cycle: </span>{billingCycle}</div>
            <div style={styles.metaRow}><span style={{ color: brand.muted }}>Invoice date: </span>{invoiceDate}</div>
            <div style={styles.metaRow}><span style={{ color: brand.muted }}>Due date: </span>{dueDate}</div>
            <div style={styles.metaRow}><span style={{ color: brand.muted }}>Currency: </span>{currency}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <div style={{ ...styles.box, backgroundColor: '#F1EEFB', borderColor: '#E4DEFB', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={styles.metaLabel}>Amount Due</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: brand.navy, marginTop: '2px' }}>{money(amountDue, currency)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...styles.metaRow, color: brand.muted }}>Total {money(total, currency)}</div>
          <div style={{ ...styles.metaRow, color: brand.muted }}>Paid {money(0, currency)}</div>
        </div>
      </div>
    </div>

    <Heading as="h2" style={{ ...styles.h2, marginTop: '22px' }}>Detailed breakdown</Heading>
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: `1px solid ${brand.hairline}`, borderRadius: '8px', overflow: 'hidden' }}>
      <thead style={{ backgroundColor: brand.soft }}>
        <tr>
          <th style={th}>Description</th>
          <th style={th}>Ad account / Campaign</th>
          <th style={thR}>Impressions</th>
          <th style={thR}>Clicks</th>
          <th style={thR}>Spend ({currency})</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i}>
            <td style={td}>{l.description}</td>
            <td style={td}>{l.ad_account || '—'}</td>
            <td style={tdR}>{fmtNum(l.impressions)}</td>
            <td style={tdR}>{fmtNum(l.clicks)}</td>
            <td style={tdR}>{money(l.amount, currency)}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={4} style={{ ...tdR, fontWeight: 700, color: brand.navy, borderBottom: 'none' }}>Total ad spend (before tax)</td>
          <td style={{ ...tdR, fontWeight: 700, color: brand.navy, borderBottom: 'none' }}>{money(subtotal, currency)}</td>
        </tr>
      </tbody>
    </table>

    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: '18px' }}>
      <tbody>
        <tr>
          <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px' }}>
            <div style={{ ...styles.box, padding: '14px 16px' }}>
              <div style={styles.metaLabel}>Tax Breakdown</div>
              <div style={{ ...styles.metaRow, marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}><span>GST ({taxRate}%)</span><span>{money(taxAmount, currency)}</span></div>
            </div>
          </td>
          <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px' }}>
            <div style={{ ...styles.box, padding: '14px 16px' }}>
              <div style={styles.metaLabel}>Total Summary</div>
              <div style={{ ...styles.metaRow, display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
              <div style={{ ...styles.metaRow, display: 'flex', justifyContent: 'space-between' }}><span>Tax ({taxRate}%)</span><span>{money(taxAmount, currency)}</span></div>
              <Hr style={{ ...styles.hr, margin: '8px 0' }} />
              <div style={{ ...styles.metaRow, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: brand.navy }}><span>Total</span><span>{money(total, currency)}</span></div>
              <div style={{ ...styles.metaRow, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: brand.navy }}><span>Amount due</span><span>{money(amountDue, currency)}</span></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    {invoiceUrl && (
      <div style={{ textAlign: 'center', marginTop: '22px' }}>
        <Button href={invoiceUrl} style={styles.button}>View invoice online</Button>
      </div>
    )}

    <Hr style={styles.hr} />
    <Heading as="h2" style={styles.h2}>Payment instructions</Heading>
    <Text style={styles.muted}>
      {paymentInstructions ||
        'Please pay before the due date to avoid interruption of your ad campaigns. Bank: HDFC Bank Ltd. · A/C: AureliX Digital Pvt. Ltd. · A/C No.: 50200012345678 · IFSC: HDFC0001234. Share the payment reference at accounts@aurelix.com.'}
    </Text>
    <Text style={styles.muted}>
      Questions? Contact finance@parallaxai.in. Late payments may result in campaign suspension and interest charges.
    </Text>
    <Text style={{ ...styles.muted, marginTop: '10px' }}>
      This is a computer-generated invoice and does not require a signature.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Aurelix Ads Invoice ${d.invoiceNumber} · ${d.billingCycle}`,
  displayName: 'Ads — Postpaid Invoice',
  fromAlias: 'finance',
  fromName: 'Aurelix Ads Finance',
  previewData: {
    invoiceNumber: 'INV-2025-05-00031',
    billTo: {
      name: 'TechNova Solutions Pvt. Ltd.',
      address: 'Regd. Office:\n8th Floor, Tower A, Cyber City\nGurugram, Haryana - 122002, India',
      gstin: '06AABCT1234B1Z8',
      email: 'accounts@technova.com',
    },
    billingCycle: '01 May 2025 – 31 May 2025',
    invoiceDate: '01 June 2025',
    dueDate: '30 June 2025',
    currency: 'INR',
    lines: [
      { description: 'Brand Awareness Campaign', ad_account: 'AUR-ACC-1001', impressions: 1245320, clicks: 18452, amount: 78540 },
      { description: 'Product Launch Campaign', ad_account: 'AUR-ACC-1001', impressions: 985210, clicks: 15230, amount: 65450 },
      { description: 'Retargeting Campaign', ad_account: 'AUR-ACC-1002', impressions: 632450, clicks: 9876, amount: 38760 },
      { description: 'Leads Generation Campaign', ad_account: 'AUR-ACC-1002', impressions: 412330, clicks: 6821, amount: 25600 },
    ],
    subtotal: 208350,
    taxRate: 18,
    taxAmount: 37503,
    total: 245860,
    amountDue: 245860,
    invoiceUrl: 'https://parallaxai.in/ads',
  },
} satisfies TemplateEntry
