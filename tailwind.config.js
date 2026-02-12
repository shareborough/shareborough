/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f6f7f4",
          100: "#e8ebe3",
          200: "#d3d9c9",
          300: "#b5c0a4",
          400: "#96a67e",
          500: "#7a8c63",
          600: "#5f6f4c",
          700: "#4b573d",
          800: "#3e4834",
          900: "#353d2e",
        },
        warm: {
          50: "#fdf8f3",
          100: "#f9ede0",
          200: "#f2d8be",
          300: "#eabc93",
          400: "#e09966",
          500: "#d77e45",
          600: "#c9653a",
          700: "#a74f31",
          800: "#86412e",
          900: "#6d3728",
        },
      },
    },
  },
  plugins: [],
};
