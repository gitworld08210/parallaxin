// Central registry for all Aurelix transactional email templates.
// Each template exports `template` satisfying TemplateEntry.
// fromAlias/fromName control the visible sender per template.

import { template as hrWelcome } from './hr-welcome.tsx'
import { template as hrHireNotification } from './hr-hire-notification.tsx'
import { template as offerLetter } from './offer-letter.tsx'
import { template as credentialsIssued } from './credentials-issued.tsx'
import { template as departmentAppointment } from './department-appointment.tsx'
import { template as payslipReleased } from './payslip-released.tsx'
import { template as aapInvoice } from './aap-invoice.tsx'

export interface TemplateEntry {
  // React component (typed loose to keep this Deno-safe)
  component: (props: any) => any
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient (overrides caller-provided recipientEmail). */
  to?: string
  /** Local part of From address, e.g. "hr" -> hr@parallaxai.in. Default: noreply */
  fromAlias?: string
  /** Display name shown in the inbox, e.g. "Aurelix HR". Default: SITE_NAME. */
  fromName?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'hr-welcome': hrWelcome,
  'hr-hire-notification': hrHireNotification,
  'offer-letter': offerLetter,
  'credentials-issued': credentialsIssued,
  'department-appointment': departmentAppointment,
  'payslip-released': payslipReleased,
  'aap-invoice': aapInvoice,
}
