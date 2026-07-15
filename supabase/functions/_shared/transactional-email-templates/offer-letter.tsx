/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Button, Heading, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { AurelixLayout, styles, Hr } from './_layout.tsx'

interface Props {
  candidateName?: string
  position?: string
  department?: string
  ctc?: string
  currency?: string
  joiningDate?: string
  acceptUrl?: string
  offerDocUrl?: string
  validUntil?: string
}

const Email = ({
  candidateName,
  position,
  department,
  ctc,
  currency,
  joiningDate,
  acceptUrl,
  offerDocUrl,
  validUntil,
}: Props) => (
  <AurelixLayout
    kicker="CAREERS AT AURELIX"
    preview={`Your offer from Aurelix${position ? ` — ${position}` : ''}`}
  >
    <Heading style={styles.h1}>Dear {candidateName || 'Candidate'},</Heading>
    <Text style={styles.p}>
      We're delighted to extend a formal offer of employment at{' '}
      <strong>Aurelix</strong>. After careful evaluation, we believe you're the
      right person to help us build the future.
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
      {ctc && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Total Compensation</div>
          <div>
            {currency || 'INR'} {ctc} per annum
          </div>
        </div>
      )}
      {joiningDate && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Proposed Joining Date</div>
          <div>{joiningDate}</div>
        </div>
      )}
      {validUntil && (
        <div style={styles.metaRow}>
          <div style={styles.metaLabel}>Offer Valid Until</div>
          <div>{validUntil}</div>
        </div>
      )}
    </div>

    {acceptUrl && (
      <>
        <Hr style={styles.hr} />
        <Button href={acceptUrl} style={styles.button}>
          Review & Accept Offer
        </Button>
      </>
    )}

    {offerDocUrl && (
      <Text style={styles.muted}>
        Full offer letter PDF: <a href={offerDocUrl}>{offerDocUrl}</a>
      </Text>
    )}

    <Hr style={styles.hr} />
    <Text style={styles.muted}>
      Questions about your offer? Just reply to this email — Aurelix Careers.
    </Text>
  </AurelixLayout>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Your offer from Aurelix${d?.position ? ` — ${d.position}` : ''}`,
  displayName: 'Careers — Offer Letter',
  fromAlias: 'careers',
  fromName: 'Aurelix Careers',
  previewData: {
    candidateName: 'Meera Kapoor',
    position: 'Senior Product Manager',
    department: 'Product',
    ctc: '32,00,000',
    currency: 'INR',
    joiningDate: '01 September 2026',
    validUntil: '20 August 2026',
    acceptUrl: 'https://parallaxai.in/offers/abc',
  },
} satisfies TemplateEntry
