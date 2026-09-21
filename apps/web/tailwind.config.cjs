/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,jsx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: "#58a6ff",
        background: "#0d1117",
        card: "#161b22",
      },
    },
  },
  plugins: [],
};
