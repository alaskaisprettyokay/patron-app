import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f0eae0",
          dark: "#e5ded2",
          darker: "#d8cfbf",
        },
        ink: {
          DEFAULT: "#151311",
          light: "#5c5650",
          faint: "#8a847d",
        },
        rule: {
          DEFAULT: "#cdc5b8",
          dark: "#b5ad9f",
        },
        onda: {
          DEFAULT: "#c4813a",
          muted: "rgba(196, 129, 58, 0.15)",
          faint: "rgba(196, 129, 58, 0.07)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1.2" }],
        "display": ["3.5rem", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        "headline": ["2rem", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        receipt: "0.15em",
      },
    },
  },
  plugins: [],
};

export default config;
