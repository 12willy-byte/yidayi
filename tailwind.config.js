/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "#FEFDFB",
          100: "#FDFBF7",
          200: "#FAFAF9",
          300: "#F5F0E8",
          400: "#EDE5D3",
          500: "#E3D8BC",
        },
        warm: {
          50: "#FDF8F5",
          100: "#FBF0EA",
          200: "#F5E1D5",
          300: "#E8C7B0",
          400: "#D4A88A",
          500: "#BF8B6B",
        },
        gold: {
          50: "#FDF9F0",
          100: "#FBF2DB",
          200: "#F7E4B8",
          300: "#F0D18E",
          400: "#E8BB5F",
          500: "#D4A83A",
          600: "#B8922E",
        },
        charcoal: {
          50: "#F5F5F4",
          100: "#E8E8E5",
          200: "#D1D1CD",
          300: "#B0B0AA",
          400: "#8C8C84",
          500: "#6B6B63",
          600: "#4A4A43",
          700: "#3A3A34",
          800: "#2A2A25",
          900: "#1A1A17",
          950: "#0F0F0D",
        },
        fashion: {
          rose: "#E8C5C5",
          blush: "#F5E0E0",
          sage: "#C5D5C5",
          navy: "#2C3E50",
          cream: "#FFFDD0",
          taupe: "#B8A99A",
          slate: "#708090",
          wine: "#722F37",
        },
      },
      fontFamily: {
        sans: ["System"],
        serif: ["Georgia"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
