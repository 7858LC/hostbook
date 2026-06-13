import type { Config } from "tailwindcss"
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { ocean: "#0ea5e9" },
    },
  },
  plugins: [],
}
export default config
