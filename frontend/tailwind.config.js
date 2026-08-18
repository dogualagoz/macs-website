const path = require('path');

// content yolları bilerek mutlak: Tailwind v3 göreli glob'ları çalışma
// dizinine göre çözüyor ve webpack altında bu dizin her zaman frontend/
// olmuyor. Göreli bırakıldığında hiçbir dosya taranmıyor ve utility
// üretilmiyordu.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{js,jsx,ts,tsx}'),
    path.join(__dirname, 'public/index.html'),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
