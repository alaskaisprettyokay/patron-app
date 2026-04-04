import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f5f0e8",
          dark: "#ebe4d8",
        },
        ink: {
          DEFAULT: "#1c1917",
          light: "#78716c",
          faint: "#a8a29e",
        },
        rule: {
          DEFAULT: "#d6d0c8",
          dark: "#c4bcb0",
        },
        onda: {
          DEFAULT: "#c27a3f",
          muted: "rgba(194, 122, 63, 0.12)",
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
