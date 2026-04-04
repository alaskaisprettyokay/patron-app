import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f0eae0",
          dark: "#e5ded2",
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
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
