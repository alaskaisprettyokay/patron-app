"use client";

import { useEffect, useState } from "react";
import { Bars } from "./Wave";
import { PLATFORMS } from "../mock-data";

/**
 * Rotating platform demo — cycles through spotify/soundcloud/bandcamp/yt music/radio
 * showing the onda tip overlay sliding in on each artist's "album art".
 */
export function PlatformDemo() {
  const [idx, setIdx] = useState(0);
  const [tipKey, setTipKey] = useState(0);
  const [sent, setSent] = useState(0.03);
  const p = PLATFORMS[idx];

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % PLATFORMS.length);
      setTipKey((k) => k + 1);
      setSent((s) => s + 0.01);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* Platform tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: -1, position: "relative", zIndex: 2 }}>
        {PLATFORMS.map((pl, i) => (
          <button
            key={pl.id}
            onClick={() => { setIdx(i); setTipKey((k) => k + 1); }}
            className="font-mono lowercase"
            style={{
              padding: "10px 14px",
              fontSize: 11,
              letterSpacing: 1,
              border: "1px solid var(--onda-line, rgba(13,13,13,0.12))",
              borderBottom: idx === i ? "1px solid transparent" : "1px solid var(--onda-line, rgba(13,13,13,0.12))",
              background: idx === i ? p.chrome : "transparent",
              color: idx === i ? p.fg : "var(--onda-muted-2, #6B655B)",
              cursor: "pointer",
              flex: 1,
              transition: "background 300ms ease, color 300ms ease",
            }}
          >
            {pl.name}
          </button>
        ))}
      </div>

      {/* Mock window */}
      <div
        key={idx}
        style={{
          background: p.chrome,
          color: p.fg,
          padding: 24,
          position: "relative",
          overflow: "hidden",
          minHeight: 440,
          border: "1px solid var(--onda-line, rgba(13,13,13,0.12))",
          transition: "background 600ms ease, color 600ms ease",
        }}
      >
        {/* chrome header */}
        <div className="font-mono lowercase" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, fontSize: 10, opacity: 0.6 }}>
          <span>{p.name} · now playing</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", opacity: 0.3 }} />
            ))}
          </div>
        </div>

        {/* album art */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", marginBottom: 16, background: p.track.art }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.22), transparent 60%)" }} />
          <div className="font-mono lowercase" style={{ position: "absolute", left: 14, top: 14, fontSize: 9, color: "rgba(255,255,255,0.7)" }}>
            [ artwork ]
          </div>

          {/* onda tip overlay */}
          <div
            key={tipKey}
            style={{
              position: "absolute",
              right: 14,
              top: 14,
              background: "var(--onda-paper, #ECE6DB)",
              color: "var(--onda-ink, #0D0D0D)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "onda-slide-in-right 600ms cubic-bezier(.2,.7,.2,1)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            }}
          >
            <svg width="18" height="12" viewBox="0 0 28 20" fill="none">
              <path d="M1 10 Q 5 2, 9 10 T 17 10 T 27 10" stroke="var(--onda-rust, #B8621B)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 11 }} className="lowercase">
              <div className="font-mono" style={{ fontWeight: 500 }}>+$0.01 → {p.track.artist}</div>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--onda-muted-2, #6B655B)" }}>onda · sent</div>
            </div>
          </div>

          {/* waveform */}
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
            <Bars bars={60} seed={idx + 1} active height={20} color="rgba(255,255,255,0.85)" />
          </div>
        </div>

        {/* track row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div className="lowercase" style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{p.track.title}</div>
            <div className="lowercase" style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{p.track.artist} · {p.track.album}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.accent, display: "flex", alignItems: "center", justifyContent: "center", color: p.chrome, fontSize: 14 }}>▶</div>
        </div>

        {/* scrubber */}
        <div style={{ height: 3, background: "currentColor", opacity: 0.15, marginBottom: 4, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "38%", background: p.accent }} />
        </div>
        <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: 0.5, marginBottom: 16 }}>
          <span>1:42</span>
          <span>4:28</span>
        </div>

        {/* onda status bar */}
        <div
          className="font-mono lowercase"
          style={{
            borderTop: "1px dashed rgba(255,255,255,0.15)",
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.75 }}>
            <span className="onda-live-dot" />
            onda is listening
          </span>
          <span style={{ opacity: 0.9 }}>session · ${sent.toFixed(2)} sent</span>
        </div>
      </div>
    </div>
  );
}
