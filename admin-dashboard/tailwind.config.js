/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#eff6ff",
          100: "#dbeafe",
          300: "#93c5fd",
          500: "#3b82f6",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "\"SF Pro Display\"", "\"Helvetica Neue\"", "sans-serif"],
      },
      boxShadow: {
        glow: "0 12px 28px rgba(37, 99, 235, 0.18)",
      },
    },
  },
  plugins: [],
};
