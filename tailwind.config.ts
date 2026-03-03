import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Background colors
        "bg-primary": "#561d25",
        "bg-secondary": "#4f5054",
        "bg-tertiary": "#383c3f",

        // Accent colors
        "accent-primary": "#f3eff5",
        "accent-secondary": "#772e25",
        "accent-tertiary": "#f1bedd",

        // Text colors
        "text-primary": "#edddd4",
        "text-secondary": "#c2ccdd",

        // Utility colors
        "border-color": "#2d3748",
        success: "#10b981",
        danger: "#ef4444",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "pulse-custom": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
