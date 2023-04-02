const { createGlobPatternsForDependencies } = require('@nrwl/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dvOrange: {
          50: '#F16347'
        },
        dvDarkGray: {
          50: '#5A5A5A'
        },
        dvGreen: {
          50: '#a5d6a7',
          100: '#85aa86'
        },
        dvLightGray: {
          50: '#F5F5F5'
        },
        dvLightBrown: {
          50: '#BFAFA6'
        },
        dvBrown: {
          50: '#AA968A'
        }
      },
      screens: {
        '3xl': '2500px',
      },
    },
  },
  plugins: [],
};
