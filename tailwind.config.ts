import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0b0f",
          soft: "#15151c",
          line: "#23232e"
        },
        paper: "#f6f4ee",
        brand: {
          50: "#eefdf3",
          100: "#d6f9e2",
          200: "#aff0c6",
          300: "#78e2a3",
          400: "#3fcb7c",
          500: "#18b061",
          600: "#0c8e4d",
          700: "#0a7040",
          800: "#0b5834",
          900: "#0a482c"
        },
        accent: {
          400: "#f6c453",
          500: "#f0b429"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(0,0,0,0.04), 0 8px 30px -12px rgba(0,0,0,0.25)",
        glow: "0 0 0 1px rgba(24,176,97,0.35), 0 12px 40px -12px rgba(24,176,97,0.45)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        blink: "blink 1s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
