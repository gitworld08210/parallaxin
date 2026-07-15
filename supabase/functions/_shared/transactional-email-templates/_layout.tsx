/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

// Aurelix brand: navy #0B172F, gold #D9A521, white background for email safety.
export const brand = {
  navy: '#0B172F',
  gold: '#D9A521',
  ink: '#101828',
  muted: '#667085',
  hairline: '#E4E7EC',
  soft: '#F7F8FA',
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '0',
  backgroundColor: '#ffffff',
}

const headerBar = {
  backgroundColor: brand.navy,
  padding: '28px 32px',
  borderTop: `4px solid ${brand.gold}`,
}

const brandRow: React.CSSProperties = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '10px',
}

const wordmark = {
  color: brand.gold,
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '3px',
  margin: 0,
}

const kicker = {
  color: '#ffffffcc',
  fontSize: '10px',
  letterSpacing: '2px',
  margin: '4px 0 0 0',
  textTransform: 'uppercase' as const,
}

const content = {
  padding: '32px',
}

const footer = {
  padding: '20px 32px 32px',
  backgroundColor: brand.soft,
  borderTop: `1px solid ${brand.hairline}`,
}

const footerText = {
  color: brand.muted,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 6px 0',
}

interface LayoutProps {
  preview?: string
  kicker?: string
  children: React.ReactNode
}

export const AurelixLayout: React.FC<LayoutProps> = ({
  preview,
  kicker: kickerText,
  children,
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    {preview ? <Preview>{preview}</Preview> : null}
    <Body style={main}>
      <Container style={container}>
        <Section style={headerBar}>
          <div style={brandRow}>
            <div>
              <p style={wordmark}>AURELIX</p>
              <p style={kicker}>{kickerText || 'PARALLAX AI'}</p>
            </div>
          </div>
        </Section>
        <Section style={content}>{children}</Section>
        <Section style={footer}>
          <Text style={footerText}>
            This is an official communication from Aurelix / Parallax AI. If you
            believe you received this in error, please ignore or reply to let us
            know.
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} Aurelix. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// Reusable styles for template bodies
export const styles = {
  h1: {
    color: brand.ink,
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 12px 0',
    lineHeight: '30px',
  } as React.CSSProperties,
  h2: {
    color: brand.ink,
    fontSize: '16px',
    fontWeight: 600,
    margin: '20px 0 8px 0',
  } as React.CSSProperties,
  p: {
    color: brand.ink,
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 12px 0',
  } as React.CSSProperties,
  muted: {
    color: brand.muted,
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 8px 0',
  } as React.CSSProperties,
  hr: {
    borderColor: brand.hairline,
    margin: '20px 0',
  } as React.CSSProperties,
  button: {
    backgroundColor: brand.navy,
    color: '#ffffff',
    padding: '12px 22px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '14px',
    display: 'inline-block',
  } as React.CSSProperties,
  box: {
    backgroundColor: brand.soft,
    border: `1px solid ${brand.hairline}`,
    borderRadius: '8px',
    padding: '16px',
    margin: '12px 0',
  } as React.CSSProperties,
  metaRow: {
    color: brand.ink,
    fontSize: '13px',
    margin: '4px 0',
  } as React.CSSProperties,
  metaLabel: {
    color: brand.muted,
    fontSize: '11px',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    margin: '0 0 2px 0',
  } as React.CSSProperties,
}

export { Hr }
