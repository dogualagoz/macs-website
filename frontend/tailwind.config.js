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
    extend: {
      colors: {
        // Halloween sezonu (design/halloween): pembe #F2317C merdiveni
        // balkabagi turuncusuna cevrildi. Basamak isimleri ayni kaldi,
        // boylece macs-accent-* yazan her yer dokunulmadan donusuyor.
        macs: {
          accent: {
            DEFAULT: '#FF7A1A',
             50: '#FFF4EC',
            100: '#FFE6D2',
            300: '#FFAA6B',
            400: '#FF7A1A',
            500: '#FF7A1A',
            600: '#C2410C',
            700: '#9A3412',
            900: '#5A1F08',
          },
        },
      },
    },
  },
  plugins: [],
};
