'use client';

/**
 * Subtle, CSS-only ambient motion for the chat area: three large, heavily
 * blurred blue orbs drifting very slowly behind the content. Opacity is kept
 * low so text contrast is unaffected, and the keyframe animations are
 * disabled under prefers-reduced-motion (see globals.css), leaving a static
 * soft-gradient fallback.
 */
export default function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      data-testid="ambient-background"
      className="ambient-bg pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
    </div>
  );
}
