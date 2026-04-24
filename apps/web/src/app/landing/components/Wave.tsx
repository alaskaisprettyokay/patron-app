"use client";

/**
 * Continuous animated background wave — used in the hero and CTA.
 * Stand-alone, no props besides intensity.
 */
import { useEffect, useState } from "react";

interface WaveProps {
  intensity?: number;
  color?: string;
  subtle?: boolean;
}

export function Wave({ intensity = 1, color = "var(--onda-rust, #B8621B)", subtle = false }: WaveProps) {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let raf: number;
    const loop = () => {
      setT(performance.now() / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = 800;
  const H = 240;
  const lines = subtle ? 1 : 5;
  const paths: { d: string; op: number }[] = [];
  for (let i = 0; i < lines; i++) {
    const pts: string[] = [];
    const freq = 0.012 + i * 0.003;
    const speed = 1 + i * 0.15;
    const amp = (subtle ? 18 : 36) * intensity * (1 - i * 0.12);
    const phase = t * speed + i * 0.7;
    for (let x = 0; x <= W; x += 6) {
      const y =
        H / 2 +
        Math.sin(x * freq + phase) * amp +
        Math.sin(x * freq * 2.1 + phase * 0.7) * amp * 0.35 +
        Math.sin(x * freq * 0.5 + phase * 1.3) * amp * 0.5;
      pts.push(`${x},${y.toFixed(2)}`);
    }
    paths.push({ d: `M ${pts.join(" L ")}`, op: subtle ? 0.15 : 0.15 + i * 0.12 });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }} aria-hidden>
      <defs>
        <linearGradient id="onda-wave-fade" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.15" stopColor={color} stopOpacity="1" />
          <stop offset="0.85" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke="url(#onda-wave-fade)" strokeOpacity={p.op} strokeWidth={subtle ? 1 : 1.5} />
      ))}
    </svg>
  );
}

/** Compact vertical-bar waveform, seeded so each rendering is stable. */
interface BarsProps {
  bars?: number;
  seed?: number;
  active?: boolean;
  color?: string;
  height?: number;
}
export function Bars({ bars = 40, seed = 1, active = false, color = "currentColor", height = 28 }: BarsProps) {
  const values = (() => {
    const arr: number[] = [];
    let s = seed * 9301 + 49297;
    for (let i = 0; i < bars; i++) {
      s = (s * 9301 + 49297) % 233280;
      arr.push(0.2 + (s / 233280) * 0.8);
    }
    return arr;
  })();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, [active]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height }}>
      {values.map((v, i) => {
        const mod = active ? 0.6 + 0.4 * Math.abs(Math.sin((tick + i) * 0.7)) : 1;
        return (
          <div
            key={i}
            style={{
              width: 2,
              height: `${v * mod * 100}%`,
              background: color,
              borderRadius: 1,
              transition: "height 120ms ease",
            }}
          />
        );
      })}
    </div>
  );
}
