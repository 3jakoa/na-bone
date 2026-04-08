/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00A6F6", dark: "#0080C0", light: "#E0F4FE" },
      },
      fontFamily: { sans: ["Open Sans", "sans-serif"] },
    },
  },
  plugins: [],
};
