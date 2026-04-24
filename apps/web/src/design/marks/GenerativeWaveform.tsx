"use client";

/**
 * GenerativeWaveform — animated bar-style waveform inside a receipt card.
 * Each render plays a unique-looking wave driven by layered sine harmonics.
 *
 * Good for: hero accents, "now playing" chrome, transaction receipts,
 * anywhere a track is playing or a tip has just landed.
 */

import { CSSProperties, useEffect, useState } from "react";

interface GenerativeWaveformProps {
  /** Show the surrounding receipt frame (mono header + label footer). Default true. */
  framed?: boolean;
  /** Number of bars. Default 80. */
  bars?: number;
  /** Width in px. Default 260. Height scales with it. */
  width?: number;
  /** Track label to render in the footer when framed. */
  label?: string;
  /** Tip amount label to render in the footer when framed. */
  amount?: string;
  /** Respect reduced-motion (freezes the bars). Default true. */
  respectReducedMotion?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function GenerativeWaveform({
  framed = true,
  bars = 80,
  width = 260,
  label = "onda",
  amount = "+ $0.01",
  respectReducedMotion = true,
  className,
  style,
}: GenerativeWaveformProps) {
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

  const W = width;
  const H = Math.round(width * (90 / 260));
  const values: number[] = [];
  for (let i = 0; i < bars; i++) {
    const v =
      0.2 +
      0.4 * Math.abs(Math.sin(i * 0.35 + t * 1.3)) +
      0.4 * Math.abs(Math.sin(i * 0.12 + t * 0.6));
    values.push(v);
  }

  const svg = (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {values.map((v, i) => (
        <rect
          key={i}
          x={i * (W / bars)}
          y={H / 2 - (v * H) / 2}
          width={W / bars - 0.5}
          height={v * H}
          fill={i % 7 === 0 ? "var(--onda-rust, #B8621B)" : "var(--onda-ink, #0D0D0D)"}
        />
      ))}
    </svg>
  );

  if (!framed) {
    return (
      <div className={className} style={{ width: "100%", ...style }}>
        {svg}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        background: "var(--onda-paper-2, #E3DCCD)",
        border: "1.5px dashed var(--onda-ink, #0D0D0D)",
        padding: 16,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          letterSpacing: 1.4,
          color: "var(--onda-muted-2, #6B655B)",
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          textTransform: "lowercase",
        }}
      >
        <span>ONDA · TX</span>
        <span>·842·7a9</span>
      </div>
      {svg}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.6 }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: "var(--onda-muted-2, #6B655B)",
          }}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}
