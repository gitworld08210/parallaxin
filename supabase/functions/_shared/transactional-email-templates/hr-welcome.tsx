/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  fullName?: string
  companyEmail?: string
  tempPassword?: string
  loginUrl?: string
  position?: string
  department?: string
  joiningDate?: string
}

const Email = ({
  fullName,
  companyEmail,
  tempPassword,
  loginUrl,
  position,
  department,
  joiningDate,
}: Props) => (
  <AurelixLayout
    kicker="PEOPLE OPERATIONS"
    preview={`Welcome to Aurelix${fullName ? `, ${fullName}` : ''}`}
  >
    <Heading style={styles.h1}>Welcome to Aurelix{fullName ? `, ${fullName}` : ''} 👋</Heading>
    <Text style={styles.p}>
      We're thrilled to have you on board. Your Aurelix employee account has
      been provisioned and your first day is officially underway.
    </Text>

    {(position || department || joiningDate) && (
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
        {joiningDate && (
          <div style={styles.metaRow}>
            <div style={styles.metaLabel}>Joining Date</div>
            <div>{joiningDate}</div>
          </div>
        )}
      </div>
    )}

    <Heading style={styles.h2}>Your login credentials</Heading>
    <div style={styles.box}>
      {companyEmail && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Company email</div>
          <div>{companyEmail}</div>
        </div>
      )}
      {tempPassword && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Temporary password</div>
          <div style={{ fontFamily: 'monospace' }}>{tempPassword}</div>
        </div>
      )}
    </div>
    <Text style={styles.muted}>
      Please change your password immediately after your first sign-in.
    </Text>

    {loginUrl && (
      <>
        <Hr style={styles.hr} />
        <Button href={loginUrl} style={styles.button}>
          Sign in to Aurelix
        </Button>
      </>
    )}

    <Hr style={styles.hr} />
    <Text style={styles.muted}>
      If you have any questions, just reply to this email — People Operations is
      here to help.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Welcome to Aurelix${d?.fullName ? `, ${d.fullName}` : ''}`,
  displayName: 'HR — Welcome to Aurelix',
  fromAlias: 'hr',
  fromName: 'Aurelix HR',
  previewData: {
    fullName: 'Aditi Sharma',
    companyEmail: 'aditi@parallaxai.in',
    tempPassword: 'Tmp!7f9K2xQr',
    loginUrl: 'https://parallaxai.in/auth',
    position: 'Product Designer',
    department: 'Product',
    joiningDate: '01 August 2026',
  },
} satisfies TemplateEntry
