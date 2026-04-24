"use client";

/**
 * BreathingO — the "O" as a living, breathing mark.
 * Concentric elliptical rings pulse at different phases around a warm
 * orange light at the centre that slowly fades in and out (~6s cycle).
 *
 * Use as an app-icon-style mark, or as a hero accent sitting next to
 * the "nda" letterforms to spell "onda".
 */

import { CSSProperties, useEffect, useState } from "react";

interface BreathingOProps {
  /** Overall width in px. Default 360 (full lockup). */
  width?: number;
  /** Show the "nda" letterforms beside the mark. Default true. */
  withLockup?: boolean;
  /** Respect reduced-motion. Default true. */
  respectReducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function BreathingO({
  width = 360,
  withLockup = true,
  respectReducedMotion = true,
  className,
  style,
}: BreathingOProps) {
  const [t, setT] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (respectReducedMotion && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }
  }, [respectReducedMotion]);

  useEffect(() => {
    if (reduced) return;
    let raf: number;
    const loop = () => {
      setT(performance.now() / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const pulse = reduced ? 1 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 6));
  const height = (140 / 360) * width;

  return (
    <svg
      width={width}
      height={height}
      viewBox={withLockup ? "0 0 360 140" : "0 0 110 140"}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="onda-breathing-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--onda-rust-glow, #F4A160)" stopOpacity={pulse} />
          <stop offset="45%" stopColor="var(--onda-rust, #B8621B)" stopOpacity={pulse * 0.5} />
          <stop offset="100%" stopColor="var(--onda-rust, #B8621B)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const phase = t * 1.2 + i * 0.7;
        const rx = 30 + Math.sin(phase) * (6 + i * 2);
        const ry = 30 + Math.cos(phase * 1.3) * (6 + i * 2);
        return (
          <ellipse
            key={i}
            cx="52"
            cy="72"
            rx={reduced ? 30 + i * 4 : rx}
            ry={reduced ? 30 + i * 4 : ry}
            fill="none"
            stroke="var(--onda-ink, #0D0D0D)"
            strokeOpacity={0.2 + (4 - i) * 0.15}
            strokeWidth="1.5"
          />
        );
      })}
      {/* Warm glow halo */}
      <circle cx="52" cy="72" r="26" fill="url(#onda-breathing-glow)" />
      {/* Central light */}
      <circle
        cx="52"
        cy="72"
        r={3 + pulse * 1.5}
        fill="var(--onda-rust-glow, #F4A160)"
        fillOpacity={pulse}
      />
      <circle
        cx="52"
        cy="72"
        r="2"
        fill="#FFE4C9"
        fillOpacity={0.6 + pulse * 0.4}
      />
      {withLockup && (
        <text
          x="110"
          y="104"
          fontSize="90"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-2"
          fill="var(--onda-ink, #0D0D0D)"
        >
          nda
        </text>
      )}
    </svg>
  );
}
