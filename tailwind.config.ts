import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm, premium keepsake palette. Tweak freely — design is §12's job,
        // this is just a tasteful default so Phase 1 doesn't look like a form.
        cream: "#FBF7F0",
        ink: "#2B2522",
        clay: "#B8755A",
        sage: "#7C8A6B",
        dust: "#E7DED1",
      },
      fontFamily: {
        serif: ["Georgia", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
