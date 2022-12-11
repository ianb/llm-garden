/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
    colors: Object.assign({}, colors, {
      // From https://www.color-name.com/viva-magenta.color
      magenta: "#BB2649",
      "magenta-darker": "#380B16",
      "magenta-dark": "#5E1325",
      "magenta-light": "#D67D92",
      "magenta-lighter": "#F1D4DB",
      aqua: "#26BB98",
      "aqua-darker": "#0F4B3D",
      "aqua-dark": "#17705B",
      "aqua-light": "#93DDCC",
      "aqua-lighter": "#D4F1EA",
      "aqua-lightest": "#E9F8F5",
      "blue-complement": "#17293A",
      "blue-complement-light": "#E8EAEB",
    }),
  },
  plugins: [],
};
