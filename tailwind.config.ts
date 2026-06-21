import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mushar: {
          // هوية مشار اللونية المستخرجة من ثيم العرض
          DEFAULT: "#056073",
          primary: "#056073",
          dark: "#0B2F38",
          teal: "#1A6B7B",
          mint: "#67C5B9",
          light: "#8EDDD2",
          pale: "#D1F1ED",
          cream: "#F7F8EB",
          accent: "#A11249",
          accentDark: "#570A27",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(11,47,56,0.08), 0 1px 2px rgba(11,47,56,0.06)",
        cardHover: "0 8px 24px rgba(11,47,56,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
