/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fff8db",
          100: "#f7e7b0",
          300: "#e3c96b",
          500: "#d4af37",
          700: "#b48d24",
        },
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "\"SF Pro Display\"", "\"Helvetica Neue\"", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px rgba(212,175,55,0.2)",
      },
    },
  },
  plugins: [],
};
