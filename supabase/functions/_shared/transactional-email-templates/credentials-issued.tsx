/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  fullName?: string
  loginEmail?: string
  tempPassword?: string
  loginUrl?: string
  issuedBy?: string
}

const Email = ({
  fullName,
  loginEmail,
  tempPassword,
  loginUrl,
  issuedBy,
}: Props) => (
  <AurelixLayout
    kicker="SECURITY & ACCESS"
    preview="Your Aurelix credentials"
  >
    <Heading style={styles.h1}>Hi {fullName || 'there'},</Heading>
    <Text style={styles.p}>
      New credentials have been issued for your Aurelix account
      {issuedBy ? ` by ${issuedBy}` : ''}. Please sign in and change your
      password immediately.
    </Text>

    <div style={styles.box}>
      {loginEmail && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Login email</div>
          <div>{loginEmail}</div>
        </div>
      )}
      {tempPassword && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Temporary password</div>
          <div style={{ fontFamily: 'monospace' }}>{tempPassword}</div>
        </div>
      )}
    </div>

    {loginUrl && (
      <>
        <Hr style={styles.hr} />
        <Button href={loginUrl} style={styles.button}>
          Sign in and reset password
        </Button>
      </>
    )}

    <Text style={styles.muted}>
      If you didn't expect this email, please contact People Operations
      immediately.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: 'Your Aurelix credentials',
  displayName: 'System — Credentials Issued',
  fromAlias: 'no-reply',
  fromName: 'Aurelix',
  previewData: {
    fullName: 'Employee',
    loginEmail: 'employee@parallaxai.in',
    tempPassword: 'Tmp!9k3Lm2Vx',
    loginUrl: 'https://parallaxai.in/auth',
    issuedBy: 'People Operations',
  },
} satisfies TemplateEntry
