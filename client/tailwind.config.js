/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#D4A017",
          dark: "#A3760F",
          light: "#F3DFA5",
        },
        warmwhite: "#FFFDF7",
        ink: "#1A1A1A",
        muted: "#8A8A8A",
      },
      fontFamily: {
        serif: ["Charter", "Georgia", "serif"],
        sans: ["-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
