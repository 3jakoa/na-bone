/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00A6F6", dark: "#0080C0", light: "#E0F4FE" },
      },
    },
  },
  plugins: [],
};
