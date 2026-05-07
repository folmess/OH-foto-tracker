import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201f",
        mist: "#eef3f0",
        field: "#f8faf8",
        river: "#147a73",
        coral: "#d45b45",
        amber: "#c98217"
      },
      boxShadow: {
        panel: "0 12px 34px rgba(23, 32, 31, 0.16)",
        "sheet": "0 -18px 44px rgba(23, 32, 31, 0.2)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        bebas: ["Bebas Neue", "Impact", "Arial Narrow", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
