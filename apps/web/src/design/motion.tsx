"use client";

/**
 * Onda motion primitives — scroll-triggered reveals + continuous marquees.
 *
 * All components are:
 *   - zero-dependency (only React + IntersectionObserver)
 *   - reduced-motion aware (auto-disables animations)
 *   - client-only — mark the importing file with `"use client"` in app router
 *
 * Usage:
 *   import { Reveal, WordStagger, SplitReveal, MarqueeLine, CountUp } from "@/design/motion";
 */

import {
  CSSProperties,
  ElementType,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  /** If false, the element un-reveals when it leaves the viewport. Default: true. */
  once?: boolean;
}

export function useInView(
  options: UseInViewOptions = {}
): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion → reveal immediately, skip animation.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options.once !== false) io.unobserve(el);
        } else if (options.once === false) {
          setInView(false);
        }
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? "0px 0px -80px 0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [options.once, options.threshold, options.rootMargin]);

  return [ref, inView];
}

// ------------------------------------------------------------------
// <Reveal>
// ------------------------------------------------------------------

interface RevealProps {
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  distance = 24,
  duration = 900,
  as: Tag = "div",
  style,
  className,
  ...rest
}: RevealProps) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${distance}px)`,
        transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ------------------------------------------------------------------
// <WordStagger>
// ------------------------------------------------------------------

interface WordStaggerProps {
  text: string;
  delay?: number;
  step?: number;
  distance?: number;
  duration?: number;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function WordStagger({
  text,
  delay = 0,
  step = 45,
  distance = 20,
  duration = 800,
  as: Tag = "span",
  style,
  className,
}: WordStaggerProps) {
  const [ref, inView] = useInView();
  const words = text.split(" ");
  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={{ ...style, display: "inline" }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "top",
          }}
        >
          <span
            style={{
              display: "inline-block",
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : `translateY(${distance}px)`,
              transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${
                delay + i * step
              }ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${
                delay + i * step
              }ms`,
            }}
          >
            {w}
          </span>
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}

// ------------------------------------------------------------------
// <SplitReveal>
// For headings with mixed children (line breaks, styled spans).
// ------------------------------------------------------------------

export type SplitToken =
  | string
  | { br: true }
  | { node: ReactNode; space?: boolean };

interface SplitRevealProps {
  tokens: SplitToken[];
  delay?: number;
  step?: number;
  distance?: number;
  duration?: number;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}

export function SplitReveal({
  tokens,
  delay = 0,
  step = 50,
  distance = 26,
  duration = 900,
  as: Tag = "h2",
  style,
  className,
}: SplitRevealProps) {
  const [ref, inView] = useInView();
  let idx = 0;
  const out: ReactNode[] = [];

  const spanStyle = (i: number): CSSProperties => ({
    display: "inline-block",
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : `translateY(${distance}px)`,
    transition: `opacity ${duration}ms cubic-bezier(.2,.7,.2,1) ${
      delay + i * step
    }ms, transform ${duration}ms cubic-bezier(.2,.7,.2,1) ${
      delay + i * step
    }ms`,
  });

  tokens.forEach((tok, ti) => {
    if (typeof tok === "string") {
      const words = tok.split(" ");
      words.forEach((w, wi) => {
        const i = idx++;
        out.push(
          <span
            key={`s${ti}-${wi}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
            }}
          >
            <span style={spanStyle(i)}>{w}</span>
            {wi < words.length - 1 ? "\u00A0" : ""}
          </span>
        );
      });
    } else if ("br" in tok) {
      out.push(<br key={`br${ti}`} />);
    } else {
      const i = idx++;
      out.push(
        <span
          key={`n${ti}`}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "bottom",
          }}
        >
          <span style={spanStyle(i)}>{tok.node}</span>
          {tok.space ? "\u00A0" : ""}
        </span>
      );
    }
  });

  return (
    <Tag
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={style}
    >
      {out}
    </Tag>
  );
}

// ------------------------------------------------------------------
// <MarqueeLine>
// Continuously scrolling horizontal line. Ideal for section dividers.
// ------------------------------------------------------------------

interface MarqueeLineProps {
  text: string;
  /** Seconds for one full loop. Higher = slower. Default 30. */
  speed?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export function MarqueeLine({
  text,
  speed = 30,
  color = "var(--onda-muted-2)",
  style,
  className,
}: MarqueeLineProps) {
  const content = new Array(8).fill(text).join("  \u00B7  ");
  return (
    <div
      className={className}
      style={{ overflow: "hidden", whiteSpace: "nowrap", ...style }}
    >
      <div
        style={{
          display: "inline-block",
          animation: `onda-marquee ${speed}s linear infinite`,
          color,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "lowercase",
          paddingRight: 40,
        }}
      >
        {content}&nbsp;&nbsp;{content}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// <CountUp>
// Number ticker that animates from 0 → value when visible.
// ------------------------------------------------------------------

interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: CSSProperties;
  className?: string;
}

export function CountUp({
  value,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  style,
  className,
}: CountUpProps) {
  const [ref, inView] = useInView();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    let start: number | undefined;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={className}
      style={style}
    >
      {prefix}
      {n.toFixed(decimals)}
      {suffix}
    </span>
  );
}
