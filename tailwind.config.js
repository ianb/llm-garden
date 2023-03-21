/** @type {import('tailwindcss').Config} */
/* globals require, module */
const colors = require("tailwindcss/colors");

// Avoid warnings about deprecated colors:
const simpleColors = Object.assign({}, colors);
delete simpleColors.coolGray;
delete simpleColors.trueGray;
delete simpleColors.warmGray;
delete simpleColors.blueGray;
delete simpleColors.lightBlue;

module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      flex: { 2: "2 1 0%" },
      minHeight: {
        1: "1em",
        2: "2em",
      },
    },
    colors: Object.assign({}, simpleColors, {
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
    variants: {
      extend: {
        display: ["group-hover", "group2-hover"],
      },
    },
  },
  plugins: [],
};
