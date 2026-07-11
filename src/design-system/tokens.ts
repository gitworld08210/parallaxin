/**
 * Aurelix UI 2.0 — Design Tokens
 *
 * Single source of truth for spacing, radius, typography, motion and
 * semantic color references. All CSS custom properties live in
 * `src/index.css`; this file exposes them to TypeScript.
 *
 * Never hardcode raw hex/px in components — import from here or use
 * the semantic Tailwind classes wired in `tailwind.config.ts`.
 */

// ============ Spacing ============ (8pt system with 4 as half-step)
export const spacing = {
  0.5: "0.125rem", // 2
  1: "0.25rem",    // 4
  2: "0.5rem",     // 8
  3: "0.75rem",    // 12
  4: "1rem",       // 16
  5: "1.25rem",    // 20
  6: "1.5rem",     // 24
  8: "2rem",       // 32
  10: "2.5rem",    // 40
  12: "3rem",      // 48
  16: "4rem",      // 64
} as const;

// ============ Radius ============
export const radius = {
  sm: "0.5rem",   // 8
  md: "0.75rem",  // 12
  lg: "1rem",     // 16
  xl: "1.25rem",  // 20
  "2xl": "1.5rem", // 24
  full: "9999px",
} as const;

// ============ Typography ============
export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  scale: {
    display:      { size: "2.25rem", line: "1.15", weight: 700, tracking: "-0.02em" }, // 36
    pageTitle:    { size: "1.75rem", line: "1.2",  weight: 700, tracking: "-0.02em" }, // 28
    sectionTitle: { size: "1.25rem", line: "1.3",  weight: 600, tracking: "-0.01em" }, // 20
    cardTitle:    { size: "1rem",    line: "1.4",  weight: 600, tracking: "-0.005em" }, // 16
    body:         { size: "0.9375rem", line: "1.55", weight: 400 }, // 15
    caption:      { size: "0.8125rem", line: "1.4",  weight: 400 }, // 13
    label:        { size: "0.75rem",   line: "1.3",  weight: 500, tracking: "0.02em", uppercase: true }, // 12
  },
} as const;

// ============ Motion ============
export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 360,
  },
  ease: {
    standard: [0.2, 0, 0, 1] as const,
    emphasized: [0.3, 0, 0, 1] as const,
    outExpo: [0.16, 1, 0.3, 1] as const,
  },
  spring: {
    snappy: { type: "spring", stiffness: 420, damping: 32 } as const,
    soft:   { type: "spring", stiffness: 260, damping: 28 } as const,
  },
} as const;

// ============ Semantic color tokens ============
// Reference CSS variables — never inline hex.
export const color = {
  background: "hsl(var(--background))",
  surface: "hsl(var(--surface))",
  surfaceElevated: "hsl(var(--surface-elevated))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  foreground: "hsl(var(--foreground))",
  secondaryText: "hsl(var(--secondary-text))",
  mutedForeground: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--danger))",
} as const;

// ============ Elevation ============
export const shadow = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
  glow: "var(--shadow-glow)",
} as const;

export const tokens = { spacing, radius, typography, motion, color, shadow };
export default tokens;
