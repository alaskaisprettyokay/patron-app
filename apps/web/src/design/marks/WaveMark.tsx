/**
 * WaveMark — small static sine-wave glyph + "onda" wordmark.
 * Sized for nav bars and inline uses; not animated.
 */

import { CSSProperties } from "react";

interface WaveMarkProps {
  /** Pixel height of the mark. Default 22 (sized for a 56px nav). */
  height?: number;
  /** Render only the wave glyph, no wordmark. Default false. */
  glyphOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function WaveMark({
  height = 22,
  glyphOnly = false,
  className,
  style,
}: WaveMarkProps) {
  // viewBox is sized so glyph is ~28w x 16h, wordmark ~70w
  const vbW = glyphOnly ? 32 : 110;
  const vbH = 24;
  const width = (vbW / vbH) * height;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={className}
      style={{ display: "block", ...style }}
      aria-label="onda"
      role="img"
    >
      <path
        d="M2 12 C 6 4, 10 4, 14 12 S 22 20, 26 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!glyphOnly && (
        <text
          x="36"
          y="18"
          fontSize="18"
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-0.6"
          fill="currentColor"
        >
          onda
        </text>
      )}
    </svg>
  );
}
