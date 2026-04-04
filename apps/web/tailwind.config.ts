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
        accent: {
          DEFAULT: "#b84a32",
          muted: "rgba(184, 74, 50, 0.12)",
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
