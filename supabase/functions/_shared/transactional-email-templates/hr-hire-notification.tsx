/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  fullName?: string
  position?: string
  department?: string
  reportsTo?: string
  joiningDate?: string
  hrContactName?: string
}

const Email = ({
  fullName,
  position,
  department,
  reportsTo,
  joiningDate,
  hrContactName,
}: Props) => (
  <AurelixLayout
    kicker="PEOPLE OPERATIONS"
    preview={`Congratulations${fullName ? `, ${fullName}` : ''} — you're hired`}
  >
    <Heading style={styles.h1}>Congratulations{fullName ? `, ${fullName}` : ''} 🎉</Heading>
    <Text style={styles.p}>
      We're excited to officially welcome you to Aurelix. Your hire has been
      confirmed by the People Operations team.
    </Text>

    <div style={styles.box}>
      {position && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Position</div>
          <div>{position}</div>
        </div>
      )}
      {department && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Department</div>
          <div>{department}</div>
        </div>
      )}
      {reportsTo && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Reports To</div>
          <div>{reportsTo}</div>
        </div>
      )}
      {joiningDate && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Joining Date</div>
          <div>{joiningDate}</div>
        </div>
      )}
    </div>

    <Hr style={styles.hr} />
    <Text style={styles.p}>
      You'll receive your login credentials and onboarding checklist in a
      separate email shortly. Please look out for it.
    </Text>
    <Text style={styles.muted}>
      {hrContactName ? `— ${hrContactName}, ` : '— '}People Operations, Aurelix
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: 'Welcome to Aurelix — your hire is confirmed',
  displayName: 'HR — Hire Confirmation',
  fromAlias: 'hr',
  fromName: 'Aurelix HR',
  previewData: {
    fullName: 'Rahul Verma',
    position: 'Backend Engineer',
    department: 'Engineering',
    reportsTo: 'CTO Office',
    joiningDate: '15 August 2026',
    hrContactName: 'People Ops Team',
  },
} satisfies TemplateEntry
