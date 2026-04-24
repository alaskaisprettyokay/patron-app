"use client";

import { useEffect, useState } from "react";
import { Bars } from "./Wave";
import { LIVE_TICKER_SEED, LIVE_TICKER_LISTENERS, LIVE_TICKER_ARTISTS, LIVE_TICKER_TRACKS, LIVE_TICKER_PLATFORMS, FEATURED_ARTISTS, FAQ_ITEMS } from "../mock-data";
import { Reveal, WordStagger } from "@/design/motion";

const container = { maxWidth: 1280, margin: "0 auto", padding: "0 48px" } as const;

function btn(variant: "primary" | "secondary" | "rust"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "14px 22px",
    fontSize: 14,
    fontWeight: 600,
    border: 0,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    transition: "transform 120ms ease, background 120ms ease",
    textTransform: "lowercase",
  };
  if (variant === "primary") return { ...base, background: "var(--onda-ink, #0D0D0D)", color: "var(--onda-paper, #ECE6DB)" };
  if (variant === "secondary") return { ...base, background: "transparent", color: "var(--onda-ink, #0D0D0D)", border: "1.5px solid var(--onda-ink, #0D0D0D)" };
  return { ...base, background: "var(--onda-rust, #B8621B)", color: "var(--onda-paper, #ECE6DB)" };
}

// ---------- STATS BAR ----------
export function StatsBar() {
  // TODO: swap the 247k number for a live count from the gift feed API
  const stats = [
    { value: "$0.01", label: "per listen", note: "3.3× streaming" },
    { value: "100%", label: "to the artist", note: "no cuts. ever." },
    { value: "0", label: "middlemen", note: "direct. full stop." },
    { value: "247k", label: "waves sent", note: "this week" },
  ];
  return (
    <section style={{ background: "var(--onda-ink, #0D0D0D)", color: "var(--onda-paper, #ECE6DB)", padding: "56px 0" }}>
      <div style={{ ...container, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 48 }}>
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 120} distance={28} duration={900} style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none", paddingLeft: i > 0 ? 32 : 0 }}>
            <div className="font-mono" style={{ fontSize: 40, fontWeight: 500, letterSpacing: -1, marginBottom: 8 }}>{s.value}</div>
            <div className="lowercase" style={{ fontSize: 13, color: "var(--onda-muted, #8A8378)", marginBottom: 4 }}>{s.label}</div>
            <div className="font-mono lowercase" style={{ fontSize: 10, color: "var(--onda-rust, #B8621B)", letterSpacing: 0.5 }}>{s.note}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------- HOW IT WORKS ----------
export function HowItWorks() {
  const steps = [
    { n: "01", title: "listen to music", body: "spotify, soundcloud, bandcamp, youtube music. onda detects what's playing — quietly, in the background.", kind: "listen" as const },
    { n: "02", title: "gifts go out", body: "each track sends a gift from your balance. if the artist hasn't claimed yet, it waits for them.", kind: "send" as const },
    { n: "03", title: "artists collect", body: "verify identity. receive gifts directly. no signup. no email. just money — straight to you.", kind: "collect" as const },
  ];
  return (
    <section style={{ padding: "100px 0", borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))" }}>
      <div style={container}>
        <Reveal distance={10} duration={700}>
          <div className="font-mono lowercase" style={{ fontSize: 11, letterSpacing: 2, color: "var(--onda-muted-2, #6B655B)", marginBottom: 48 }}>how it works</div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 160} distance={32} duration={900}>
              <div style={{ marginBottom: 20, height: 140, border: "1px solid var(--onda-line, rgba(13,13,13,0.12))", background: "var(--onda-paper-2, #E3DCCD)", position: "relative", overflow: "hidden" }}>
                <StepDiagram kind={s.kind} />
              </div>
              <div className="onda-serif-italic" style={{ fontSize: 56, color: "var(--onda-faded, #CFC6B6)", fontWeight: 700, lineHeight: 1, marginBottom: 12 }}>{s.n}</div>
              <div className="lowercase" style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: -0.3 }}>{s.title}</div>
              <div className="lowercase" style={{ fontSize: 14, color: "var(--onda-muted-2, #6B655B)", lineHeight: 1.55 }}>{s.body}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepDiagram({ kind }: { kind: "listen" | "send" | "collect" }) {
  if (kind === "listen") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 200, color: "var(--onda-ink, #0D0D0D)" }}>
          <Bars bars={40} seed={7} active height={60} color="var(--onda-ink, #0D0D0D)" />
        </div>
      </div>
    );
  }
  if (kind === "send") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <Dot label="you" />
        <FlowArrow />
        <Dot label="artist" filled />
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--onda-ink, #0D0D0D)", textAlign: "center" }}>
        <div style={{ padding: "8px 12px", border: "1px solid var(--onda-ink, #0D0D0D)", background: "var(--onda-paper, #ECE6DB)" }}>
          direct deposit
        </div>
        <div style={{ marginTop: 8, color: "var(--onda-rust, #B8621B)" }}>+ $12.47</div>
      </div>
    </div>
  );
}

function Dot({ label, filled }: { label: string; filled?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: filled ? "var(--onda-rust, #B8621B)" : "transparent", border: "2px solid " + (filled ? "var(--onda-rust, #B8621B)" : "var(--onda-ink, #0D0D0D)") }} />
      <div className="font-mono lowercase" style={{ fontSize: 10, marginTop: 6, color: "var(--onda-muted-2, #6B655B)" }}>{label}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div style={{ flex: 1, position: "relative", margin: "0 12px" }}>
      <svg viewBox="0 0 200 20" width="100%" height="20" preserveAspectRatio="none">
        <path d="M0 10 Q 50 2, 100 10 T 200 10" stroke="var(--onda-rust, #B8621B)" strokeWidth="1.5" fill="none" />
        <polygon points="200,10 192,6 192,14" fill="var(--onda-rust, #B8621B)" />
      </svg>
      <div className="font-mono" style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "var(--onda-rust, #B8621B)" }}>$0.01</div>
    </div>
  );
}

// ---------- LIVE TICKER ----------
export function LiveTicker() {
  const [events, setEvents] = useState(LIVE_TICKER_SEED);

  useEffect(() => {
    const id = setInterval(() => {
      const e = {
        id: Math.random(),
        listener: LIVE_TICKER_LISTENERS[Math.floor(Math.random() * LIVE_TICKER_LISTENERS.length)],
        artist: LIVE_TICKER_ARTISTS[Math.floor(Math.random() * LIVE_TICKER_ARTISTS.length)],
        track: LIVE_TICKER_TRACKS[Math.floor(Math.random() * LIVE_TICKER_TRACKS.length)],
        platform: LIVE_TICKER_PLATFORMS[Math.floor(Math.random() * LIVE_TICKER_PLATFORMS.length)],
        amt: 0.01,
      };
      setEvents((prev) => [e, ...prev.slice(0, 5)]);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section style={{ padding: "100px 0", borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))" }}>
      <div style={container}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 80, alignItems: "start" }}>
          <div>
            <div className="font-mono lowercase" style={{ fontSize: 11, letterSpacing: 2, color: "var(--onda-muted-2, #6B655B)", marginBottom: 24 }}>live feed</div>
            <h2 className="lowercase" style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1.8, margin: "0 0 24px" }}>
              <WordStagger text="every" step={60} distance={28} />{" "}
              <WordStagger delay={150} text="wave" step={60} distance={28} className="onda-serif-italic" style={{ color: "var(--onda-rust, #B8621B)" }} />
              <br />
              <WordStagger delay={300} text="is public." step={60} distance={28} />
            </h2>
            <p className="lowercase" style={{ fontSize: 16, color: "var(--onda-muted-2, #6B655B)", lineHeight: 1.55, maxWidth: 380 }}>
              no balance sheet. no quarterly report. every tip is posted publicly, in real time — so listeners can see who they're supporting, and artists can see what's landing.
            </p>
            <button style={{ ...btn("secondary"), marginTop: 28 }}>see the full feed →</button>
          </div>
          <div style={{ background: "var(--onda-paper-2, #E3DCCD)", border: "1px solid var(--onda-line, rgba(13,13,13,0.12))" }}>
            <div className="font-mono lowercase" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--onda-muted-2, #6B655B)", padding: "14px 20px", borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))", display: "flex", justifyContent: "space-between" }}>
              <span>recent tips</span>
              <span>listener / track / amount</span>
            </div>
            {events.map((e, i) => (
              <div
                key={e.id}
                style={{
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 70px 60px",
                  gap: 16,
                  alignItems: "center",
                  borderBottom: i < events.length - 1 ? "1px solid var(--onda-line, rgba(13,13,13,0.12))" : "none",
                  fontSize: 13,
                  opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.12),
                  transition: "opacity 400ms ease",
                }}
              >
                <span className="font-mono lowercase" style={{ color: "var(--onda-muted-2, #6B655B)" }}>@{e.listener}</span>
                <span className="lowercase">
                  <span style={{ color: "var(--onda-ink, #0D0D0D)" }}>{e.track}</span>
                  <span style={{ color: "var(--onda-muted-2, #6B655B)" }}> · {e.artist}</span>
                </span>
                <span className="font-mono" style={{ color: "var(--onda-rust, #B8621B)" }}>+${e.amt.toFixed(2)}</span>
                <span className="font-mono lowercase" style={{ fontSize: 10, color: "var(--onda-muted-2, #6B655B)", textAlign: "right" }}>{e.platform}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- ARTIST SPOTLIGHT ----------
export function ArtistSpotlight() {
  return (
    <section style={{ padding: "100px 0", borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))" }}>
      <div style={container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48 }}>
          <div>
            <div className="font-mono lowercase" style={{ fontSize: 11, letterSpacing: 2, color: "var(--onda-muted-2, #6B655B)", marginBottom: 16 }}>artists receiving waves</div>
            <h2 className="lowercase" style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1.8, margin: 0 }}>
              <WordStagger text="paid in" step={70} distance={28} />{" "}
              <WordStagger delay={200} text="full." step={70} distance={28} className="onda-serif-italic" style={{ color: "var(--onda-rust, #B8621B)" }} />
            </h2>
            <p className="lowercase" style={{ fontSize: 15, color: "var(--onda-muted-2, #6B655B)", marginTop: 16, maxWidth: 440, lineHeight: 1.5 }}>
              onda works best for the artists streaming pays worst — the ones in the long tail, the ones whose fans would happily give more if they could.
            </p>
          </div>
          <button style={btn("secondary")}>browse all artists →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {FEATURED_ARTISTS.map((a, i) => (
            <ArtistCard key={i} artist={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArtistCard({ artist, index }: { artist: typeof FEATURED_ARTISTS[number]; index: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: "1px solid var(--onda-line, rgba(13,13,13,0.12))",
        background: "var(--onda-paper-2, #E3DCCD)",
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        position: "relative",
        transition: "transform 200ms ease",
        transform: hover ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{ position: "relative", minHeight: 220, background: artist.art, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.18), transparent 60%)" }} />
        <div className="font-mono lowercase" style={{ position: "absolute", left: 10, top: 10, fontSize: 9, color: "rgba(255,255,255,0.7)" }}>[ {artist.artNote} ]</div>
        <div style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
          <Bars bars={34} seed={index + 7} active={hover} height={22} color="rgba(255,255,255,0.9)" />
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <div className="lowercase" style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{artist.name}</div>
            <div className="lowercase" style={{ fontSize: 11, color: "var(--onda-muted-2, #6B655B)", marginTop: 2 }}>{artist.tag} · {artist.loc}</div>
          </div>
          <div className="lowercase" style={{ fontSize: 12, color: "var(--onda-ink, #0D0D0D)", fontStyle: "italic", lineHeight: 1.45, borderLeft: "2px solid var(--onda-rust, #B8621B)", paddingLeft: 10, margin: "10px 0 14px" }}>
            "{artist.quote}"
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {artist.handles.map((h, i) => (
              <span key={i} className="font-mono lowercase" style={{ fontSize: 10, padding: "3px 7px", border: "1px solid var(--onda-line, rgba(13,13,13,0.12))", background: "var(--onda-paper, #ECE6DB)" }}>
                <span style={{ color: "var(--onda-rust, #B8621B)" }}>{h.p}</span> <span style={{ color: "var(--onda-muted-2, #6B655B)" }}>{h.h}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--onda-line, rgba(13,13,13,0.12))", paddingTop: 10 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--onda-rust, #B8621B)" }}>{artist.earned}</div>
            <div className="font-mono lowercase" style={{ fontSize: 9, color: "var(--onda-muted-2, #6B655B)" }}>received · 30d</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="font-mono" style={{ fontSize: 14, color: "var(--onda-ink, #0D0D0D)" }}>{artist.plays}</div>
            <div className="font-mono lowercase" style={{ fontSize: 9, color: "var(--onda-muted-2, #6B655B)" }}>plays · 30d</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- MANIFESTO ----------
export function Manifesto() {
  return (
    <section style={{ padding: "120px 0", background: "var(--onda-ink, #0D0D0D)", color: "var(--onda-paper, #ECE6DB)", position: "relative", overflow: "hidden" }}>
      <div style={{ ...container, position: "relative" }}>
        <div className="font-mono lowercase" style={{ fontSize: 11, letterSpacing: 2, color: "var(--onda-muted, #8A8378)", marginBottom: 32 }}>manifesto · 01</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 80, alignItems: "start" }}>
          <div style={{ position: "sticky", top: 40 }}>
            <div className="onda-serif-italic" style={{ fontSize: 120, fontWeight: 700, lineHeight: 0.9, color: "var(--onda-rust, #B8621B)" }}>"</div>
          </div>
          <div>
            <p className="lowercase" style={{ fontSize: 32, lineHeight: 1.3, fontWeight: 500, letterSpacing: -0.5, margin: "0 0 32px" }}>
              a stream is worth <span style={{ color: "var(--onda-rust, #B8621B)" }}>three tenths of a cent</span>. that's what the industry decided. we disagree.
            </p>
            <p className="lowercase" style={{ fontSize: 19, lineHeight: 1.6, color: "var(--onda-muted, #8A8378)", maxWidth: 640, margin: "0 0 24px" }}>
              the internet routes packets across the world for free. money should move just as easily. the excuse for why artists get paid in fractions of pennies doesn't hold up anymore.
            </p>
            <p className="lowercase" style={{ fontSize: 19, lineHeight: 1.6, color: "var(--onda-muted, #8A8378)", maxWidth: 640, margin: 0 }}>
              onda is a browser extension. it watches what you listen to. it sends a small tip — one cent — straight to the artist. that's the whole product. there is nothing else to build.
            </p>
            <div className="font-mono lowercase" style={{ fontSize: 12, color: "var(--onda-muted-2, #6B655B)", marginTop: 40, letterSpacing: 1 }}>— the onda team, brooklyn ny</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- FAQ ----------
export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: "100px 0", borderBottom: "1px solid var(--onda-line, rgba(13,13,13,0.12))" }}>
      <div style={container}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 80, alignItems: "start" }}>
          <div>
            <div className="font-mono lowercase" style={{ fontSize: 11, letterSpacing: 2, color: "var(--onda-muted-2, #6B655B)", marginBottom: 16 }}>questions</div>
            <h2 className="lowercase" style={{ fontSize: 56, lineHeight: 0.95, fontWeight: 800, letterSpacing: -1.8, margin: 0 }}>
              <WordStagger text="straight" step={70} distance={28} />
              <br />
              <WordStagger delay={200} text="answers." step={70} distance={28} className="onda-serif-italic" style={{ color: "var(--onda-rust, #B8621B)" }} />
            </h2>
          </div>
          <div>
            {FAQ_ITEMS.map((it, i) => (
              <div key={i} style={{ borderTop: "1px solid var(--onda-line, rgba(13,13,13,0.12))", borderBottom: i === FAQ_ITEMS.length - 1 ? "1px solid var(--onda-line, rgba(13,13,13,0.12))" : "none" }}>
                <button
                  onClick={() => setOpen(open === i ? -1 : i)}
                  style={{ width: "100%", padding: "22px 0", background: "none", border: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", color: "var(--onda-ink, #0D0D0D)" }}
                >
                  <span style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--onda-muted-2, #6B655B)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="lowercase" style={{ fontSize: 19, fontWeight: 600 }}>{it.q}</span>
                  </span>
                  <span style={{ fontSize: 20, color: "var(--onda-rust, #B8621B)", transform: open === i ? "rotate(45deg)" : "none", transition: "transform 200ms ease" }}>+</span>
                </button>
                {open === i && (
                  <div className="lowercase" style={{ paddingLeft: 52, paddingBottom: 22, fontSize: 15, color: "var(--onda-muted-2, #6B655B)", lineHeight: 1.6, maxWidth: 560 }}>
                    {it.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
