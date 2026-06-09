import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "rail-blue":  "#1e3a8a",
        "rail-green": "#16a34a",
        "rail-amber": "#f59e0b",
        "rail-red":   "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
