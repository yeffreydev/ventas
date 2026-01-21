import type { Config } from "tailwindcss";
import flowbite from "flowbite/plugin";

export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/flowbite-react/lib/esm/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        text: "var(--text)",
        border: "var(--border)",
        "hover-bg": "var(--hover-bg)",
        "input-bg": "var(--input-bg)",
        "input-border": "var(--input-border)",
        card: "var(--card-bg)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
      },
    },
  },
  plugins: [flowbite],
} satisfies Config;