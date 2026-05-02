/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#00A6F6", dark: "#0080C0", light: "#E0F4FE" },
        page: "#F5F8FB",
        surface: "#FFFFFF",
        field: "#F7F9FC",
        line: "#DDE3EB",
        divider: "#EDF0F4",
        ink: "#111827",
        soft: "#374151",
        muted: "#9CA3AF",
        subtle: "#C8D0DA",
      },
    },
  },
  plugins: [],
};
