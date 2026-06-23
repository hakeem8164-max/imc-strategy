import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mushar: {
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
        // توكنز shadcn (مربوطة بمتغيّرات CSS في globals.css) — لا تؤثّر على
        // مكوّنات mushar الحالية لأنها أسماء مختلفة.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        // توكنز shadcn فقط (لا تُلغي rounded الافتراضية المستخدمة حاليًا)
        "shadcn-lg": "var(--radius)",
        "shadcn-md": "calc(var(--radius) - 2px)",
        "shadcn-sm": "calc(var(--radius) - 4px)",
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
  plugins: [animate],
};

export default config;

