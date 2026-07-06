/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: "#08100f",
        ink: "#0f1717",
        pearl: "#f7f3ea",
        dune: "#d8c58a",
        palm: "#5dd39e",
        lagoon: "#46c7d4",
        coral: "#ff7d6e",
        asphalt: "#263231"
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 0 48px rgba(93, 211, 158, 0.24)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.24)"
      }
    }
  },
  plugins: []
};
