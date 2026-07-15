/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  fullName?: string
  role?: string
  department?: string
  appointedBy?: string
  effectiveDate?: string
  responsibilities?: string[]
}

const Email = ({
  fullName,
  role,
  department,
  appointedBy,
  effectiveDate,
  responsibilities,
}: Props) => (
  <AurelixLayout
    kicker="DEPARTMENT OFFICE"
    preview={`You've been appointed as ${role || 'a new role'}`}
  >
    <Heading style={styles.h1}>Dear {fullName || 'Team Member'},</Heading>
    <Text style={styles.p}>
      Congratulations. You have been formally appointed to the following role
      within Aurelix{appointedBy ? ` by ${appointedBy}` : ''}.
    </Text>

    <div style={styles.box}>
      {role && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Role</div>
          <div>{role}</div>
        </div>
      )}
      {department && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Department</div>
          <div>{department}</div>
        </div>
      )}
      {effectiveDate && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Effective From</div>
          <div>{effectiveDate}</div>
        </div>
      )}
    </div>

    {responsibilities && responsibilities.length > 0 && (
      <>
        <Heading style={styles.h2}>Key Responsibilities</Heading>
        <ul style={{ ...styles.p, paddingLeft: '20px', margin: 0 }}>
          {responsibilities.map((r, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {r}
            </li>
          ))}
        </ul>
      </>
    )}

    <Hr style={styles.hr} />
    <Text style={styles.muted}>
      This appointment is issued from the Department Office and is recorded in
      your Employee Passport.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Appointment: ${d?.role || 'New Role'} at Aurelix`,
  displayName: 'Department — Appointment',
  fromAlias: 'office',
  fromName: 'Aurelix Department Office',
  previewData: {
    fullName: 'Karan Mehta',
    role: 'Engineering Manager',
    department: 'Engineering',
    appointedBy: 'CTO',
    effectiveDate: '01 August 2026',
    responsibilities: [
      'Lead a team of 6 engineers.',
      'Own delivery of the platform reliability roadmap.',
      'Mentor senior engineers.',
    ],
  },
} satisfies TemplateEntry
