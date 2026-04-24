# onda design system

Drop-in design primitives for the onda web app. Everything here is
additive — nothing replaces existing code.

## What's inside

```
design/
├── tokens.css              # CSS custom properties (--onda-*) + keyframes
├── motion.tsx              # Reveal, WordStagger, SplitReveal, MarqueeLine, CountUp
└── marks/
    ├── BreathingO.tsx      # The "O" as a living mark with a pulsing light
    └── GenerativeWaveform.tsx  # Animated bar waveform inside a receipt card
```

## Install

### 1. Token variables

Add to `apps/web/src/app/globals.css` **after** the `@tailwind` imports:

```css
@import "../design/tokens.css";
```

(Or `@import "@/design/tokens.css"` depending on your alias setup.)

All variables are namespaced `--onda-*` so they coexist with the
existing `paper` / `ink` / `onda` Tailwind colors.

### 2. Use the motion primitives

Any component importing these needs the `"use client"` directive
(they use `IntersectionObserver`):

```tsx
"use client";

import { Reveal, WordStagger, SplitReveal, MarqueeLine } from "@/design/motion";

export default function Hero() {
  return (
    <>
      <Reveal>
        <p className="onda-mono">live · tipping artists right now</p>
      </Reveal>

      <SplitReveal
        as="h1"
        tokens={[
          "every play",
          { br: true },
          "sends a",
          { br: true },
          {
            node: (
              <span className="onda-serif-italic text-onda">wave.</span>
            ),
          },
        ]}
        step={80}
        distance={40}
        duration={1000}
        className="text-7xl font-bold tracking-tight leading-[0.92] lowercase"
      />

      <MarqueeLine
        text="every play sends a wave · direct to artists · no middlemen"
        speed={60}
      />
    </>
  );
}
```

### 3. Use the marks

```tsx
import { BreathingO } from "@/design/marks/BreathingO";
import { GenerativeWaveform } from "@/design/marks/GenerativeWaveform";

<BreathingO width={240} />
<GenerativeWaveform label="onda" amount="+ $0.01 → claire rousay" />
```

## Accessibility

All animated components honour `prefers-reduced-motion: reduce`:

- `Reveal` / `WordStagger` / `SplitReveal` reveal instantly (no slide).
- `BreathingO` freezes into a static ring arrangement with full light.
- `GenerativeWaveform` freezes on the first frame.
- `.onda-live-dot` stops pulsing.

No extra configuration needed.

## Typography

Two fonts beyond what's already loaded via Tailwind:

| Family | Where to use |
|--------|--------------|
| `Inter` (existing) | Default body + headings |
| `JetBrains Mono` (existing) | Labels, tickers, receipt chrome |
| `Fraunces` (new) | Italic accent on a single word per heading — use `.onda-serif-italic` or the font-family directly |

Add to your font loader (e.g. `app/layout.tsx`) if you don't already
have Fraunces:

```tsx
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["700"],
  variable: "--font-fraunces",
});

// In <html className={`${fraunces.variable} ...`}>
```

Then tokens.css's `.onda-serif-italic` picks it up automatically.

## Design DNA

A single heading treatment drives the system:

1. **Copy is always lowercase.** `every play sends a wave.`
2. **One word per heading gets the Fraunces italic.** Usually the last
   noun. Also coloured `var(--onda-rust)`.
3. **Eyebrows above sections** are mono, 11 px, `letter-spacing: 2`,
   coloured `var(--onda-muted-2)`.
4. **Reveals stagger on scroll** — 45–90 ms per word is the sweet spot.
5. **Marquees between sections** add continuous motion without being
   obtrusive.

## Next steps

- Wire `BreathingO` into the nav `onda` wordmark for a living brand presence.
- Replace the existing hero's `<span className="text-onda">wave.</span>`
  with a `SplitReveal` to get the staggered entry.
- Add a `<MarqueeLine>` below the dark stats bar as a section divider.
