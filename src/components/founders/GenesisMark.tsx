/** Subtle watermark sigil shown on posts by founders. */
export const GenesisMark = ({ size = 11 }: { size?: number }) => (
  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-aura/80">
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <polygon points="12,3 20,8 20,16 12,21 4,16 4,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
    Genesis
  </span>
);
