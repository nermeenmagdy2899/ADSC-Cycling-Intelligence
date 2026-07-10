/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        obsidian: "#02040A",
        ink: "#070D18",
        pearl: "#EEF4FC",
        dune: "#E7C688",
        palm: "#E7C688",
        lagoon: "#89C7FF",
        coral: "#D99B4E",
        adscblue: "#0B1320",
        adscviolet: "#6C7C93",
        asphalt: "#111C2C"
      },
      fontFamily: {
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "Sora", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(231, 198, 136, 0.26), 0 0 24px rgba(137, 199, 255, 0.14)",
        panel: "0 30px 90px rgba(0, 0, 0, 0.34)"
      }
    }
  },
  plugins: []
};
