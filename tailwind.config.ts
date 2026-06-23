import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // هوية شركة المساجد المتكاملة: أساسي طوبي #8C341F + ثانوي ذهبي #BD9258
          DEFAULT: "#8C341F",
          primary: "#8C341F",
          dark: "#5A2114",
          teal: "#A8452A",
          mint: "#BD9258",
          light: "#D9BB91",
          pale: "#F3E6D6",
          cream: "#FBF7F1",
          accent: "#BD9258",
          accentDark: "#8A6A3E",
          // أسطح الوضع الليلي (توكنز موحّدة لمكوّنات Base UI)
          ink: "#E6EEF0",
          line: "#2B3D44",
          surface: "#13232A",
          field: "#0F1D22",
          hover: "#1B2D34",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(90,33,20,0.08), 0 1px 2px rgba(90,33,20,0.06)",
        cardHover: "0 8px 24px rgba(90,33,20,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
