import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f4efe6",
          dark: "#eae3d6",
          darker: "#ddd5c5",
        },
        ink: {
          DEFAULT: "#1a1816",
          light: "#6b6560",
          faint: "#9c958e",
        },
        rule: {
          DEFAULT: "#d2cbc2",
          dark: "#bfb8ad",
        },
        onda: {
          DEFAULT: "#b5894c",
          muted: "rgba(181, 137, 76, 0.10)",
          faint: "rgba(181, 137, 76, 0.06)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1.2" }],
      },
      letterSpacing: {
        receipt: "0.12em",
      },
    },
  },
  plugins: [],
};

export default config;
