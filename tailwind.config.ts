import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B3A6B",
          50:  "#EEF2F9",
          100: "#D4DFEE",
          200: "#A9BEDD",
          300: "#7E9DCC",
          400: "#537CBB",
          500: "#1B3A6B",
          600: "#152E56",
          700: "#102340",
          800: "#0A172B",
          900: "#050C15",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F7FA",
        },
        border: {
          DEFAULT: "#E8ECF4",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", ...fontFamily.sans],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 4px 0 rgba(27,58,107,0.06)",
        "card-hover": "0 4px 12px 0 rgba(27,58,107,0.10)",
      },
    },
  },
  plugins: [],
}

export default config
