/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  fullName?: string
  period?: string
  netPay?: string
  currency?: string
  payslipUrl?: string
}

const Email = ({ fullName, period, netPay, currency, payslipUrl }: Props) => (
  <AurelixLayout
    kicker="PAYROLL"
    preview={`Your ${period || 'latest'} payslip is ready`}
  >
    <Heading style={styles.h1}>Hi {fullName || 'there'},</Heading>
    <Text style={styles.p}>
      Your payslip for <strong>{period || 'the latest payroll cycle'}</strong>{' '}
      has been released and is ready to view.
    </Text>

    {netPay && (
      <div style={styles.box}>
        <div style={styles.metaLabel}>Net Pay</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#0B172F' }}>
          {currency || 'INR'} {netPay}
        </div>
      </div>
    )}

    {payslipUrl && (
      <>
        <Hr style={styles.hr} />
        <Button href={payslipUrl} style={styles.button}>
          View Payslip
        </Button>
      </>
    )}

    <Hr style={styles.hr} />
    <Text style={styles.muted}>
      Questions about your payslip? Contact Payroll at payroll@parallaxai.in.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Your ${d?.period || 'latest'} Aurelix payslip is ready`,
  displayName: 'Payroll — Payslip Released',
  fromAlias: 'payroll',
  fromName: 'Aurelix Payroll',
  previewData: {
    fullName: 'Aditi Sharma',
    period: 'July 2026',
    netPay: '1,84,500',
    currency: 'INR',
    payslipUrl: 'https://parallaxai.in/wallet/payslips',
  },
} satisfies TemplateEntry
