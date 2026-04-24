"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal, SplitReveal, WordStagger, MarqueeLine } from "@/design/motion";
import { Wave } from "./landing/components/Wave";
import { PlatformDemo } from "./landing/components/PlatformDemo";
import { StatsBar, HowItWorks, LiveTicker, ArtistSpotlight, Manifesto, FAQ } from "./landing/components/Sections";

const container = { maxWidth: 1280, margin: "0 auto", padding: "0 48px" } as const;

function btn(variant: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "14px 22px", fontSize: 14, fontWeight: 600, border: 0, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 10, textTransform: "lowercase",
    transition: "background 120ms ease",
  };
  if (variant === "primary") return { ...base, background: "var(--onda-ink, #0D0D0D)", color: "var(--onda-paper, #ECE6DB)" };
  return { ...base, background: "transparent", color: "var(--onda-ink, #0D0D0D)", border: "1.5px solid var(--onda-ink, #0D0D0D)" };
}

function PlatformChip({ name }: { name: string }) {
  return (
    <span style={{ border: "1px solid var(--onda-line, rgba(13,13,13,0.12))", borderRadius: 999, padding: "4px 10px", fontSize: 11, background: "rgba(255,255,255,0.3)" }}>
      {name}
    </span>
  );
}

export default function Home() {
  // onClick stubs — the existing app already has /claim + /onda.zip wired up.
  const onDownload = () => { window.location.href = "/onda.zip"; };

  return (
    <div data-screen-label="01 Landing">
      {/* ---------- HERO ---------- */}
      <section style={{ position: "relative", padding: "80px 0 100px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }}>
          <div style={{ position: "absolute", right: "-5%", top: "10%", width: "65%", height: "60%" }}>
            <Wave intensity={1} />
          </div>
        </div>

        <div style={{ ...container, position: "relative", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60, alignItems: "start" }}>
          <div>
            <Reveal delay={0} distance={14} duration={700}>
              <div className="font-mono lowercase" style={{ fontSize: 11, color: "var(--onda-muted-2, #6B655B)", letterSpacing: 1.5, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                <span className="onda-live-dot" />
                live · tipping artists right now
              </div>
            </Reveal>

            <SplitReveal
              as="h1"
              tokens={[
                "every play",
                { br: true },
                "sends a",
                { br: true },
                { node: <span className="onda-serif-italic" style={{ color: "var(--onda-rust, #B8621B)" }}>wave.</span> },
              ]}
              step={80}
              distance={40}
              duration={1000}
              style={{
                fontSize: 108, lineHeight: 0.92, fontWeight: 800, letterSpacing: -3.5,
                margin: "0 0 32px", color: "var(--onda-ink, #0D0D0D)", textTransform: "lowercase",
              }}
            />

            <Reveal delay={500} distance={14} duration={700}>
              <p className="lowercase" style={{ fontSize: 18, lineHeight: 1.5, color: "var(--onda-muted-2, #6B655B)", maxWidth: 440, margin: "0 0 40px" }}>
                streaming pays artists a third of a penny per play.<br />
                onda lets you give them <strong style={{ color: "var(--onda-ink, #0D0D0D)" }}>a whole cent directly</strong>.
                no labels. no middlemen. just sound.
              </p>
            </Reveal>

            <Reveal delay={700} distance={14} duration={700} style={{ display: "flex", gap: 12, marginBottom: 32 }}>
              <button onClick={onDownload} style={btn("primary")}>
                <span>download extension</span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>↓</span>
              </button>
              <Link href="/claim" style={btn("secondary")}>i'm an artist</Link>
            </Reveal>

            <Reveal delay={850} distance={10} duration={700} className="lowercase" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--onda-muted-2, #6B655B)", flexWrap: "wrap" }}>
              <span>works with</span>
              <PlatformChip name="spotify" />
              <PlatformChip name="soundcloud" />
              <PlatformChip name="bandcamp" />
              <PlatformChip name="youtube" />
              <PlatformChip name="online radio" />
            </Reveal>
          </div>

          <PlatformDemo />
        </div>
      </section>

      <StatsBar />

      <div style={{ borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))", padding: "14px 0", background: "var(--onda-paper-2, #E3DCCD)" }}>
        <MarqueeLine text="every play sends a wave · direct to artists · no middlemen · a whole cent · listen generously" speed={60} />
      </div>

      <HowItWorks />

      <div style={{ borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))", padding: "14px 0", background: "var(--onda-paper-2, #E3DCCD)" }}>
        <MarqueeLine text="claire rousay · loraine james · iglooghost · astrid sonne · perila · nkisi · jasmine infiniti · upsammy · mica levi" speed={80} color="var(--onda-rust, #B8621B)" />
      </div>

      <LiveTicker />
      <ArtistSpotlight />
      <Manifesto />
      <FAQ />

      {/* ---------- CTA ---------- */}
      <section style={{ padding: "140px 0 120px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: 300, opacity: 0.4 }}>
          <Wave intensity={1.3} />
        </div>
        <div style={{ ...container, position: "relative" }}>
          <h2 className="lowercase" style={{ fontSize: 140, lineHeight: 0.9, fontWeight: 800, letterSpacing: -5, margin: "0 0 32px" }}>
            <WordStagger text="send a" step={90} distance={60} />{" "}
            <WordStagger delay={250} text="wave." step={90} distance={60} className="onda-serif-italic" style={{ color: "var(--onda-rust, #B8621B)" }} />
          </h2>
          <p className="lowercase" style={{ fontSize: 20, color: "var(--onda-muted-2, #6B655B)", marginBottom: 40 }}>
            free. takes ten seconds. works everywhere you listen.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button onClick={onDownload} style={{ ...btn("primary"), padding: "18px 28px", fontSize: 15 }}>
              download for chrome ↓
            </button>
            <button style={{ ...btn("secondary"), padding: "18px 28px", fontSize: 15 }}>firefox · safari</button>
          </div>
        </div>
      </section>
    </div>
  );
}
