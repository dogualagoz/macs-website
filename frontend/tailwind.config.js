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
        // Projeler sayfasinin vurgu rengi. Merdiven #F2317C'e sabitlendi:
        // 400 = verilen renk, digerleri ayni ton uzerinde Tailwind
        // blue'nun aciklik basamaklarini takip ediyor, boylece blue-300/500/600
        // yazan her yer birebir karsiligiyla degistirilebiliyor.
        macs: {
          accent: {
            DEFAULT: '#F2317C',
             50: '#FDF2F7',
            100: '#FAE3EE',
            300: '#DD84A8',
            400: '#F2317C',
            500: '#F2317C',
            600: '#A63A65',
            700: '#8E375A',
            900: '#532638',
          },
        },
      },
    },
  },
  plugins: [],
};
