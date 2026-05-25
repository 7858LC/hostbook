import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f0f0f",
        profit: "#22c55e",
        loss: "#ef4444",
        warning: "#f59e0b",
        ocean: "#0ea5e9",   // HostBook brand accent — ocean blue
      },
    },
  },
  plugins: [],
};

export default config;
