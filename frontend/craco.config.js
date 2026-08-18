const path = require('path');

// react-scripts 5 kendi postcss yapılandırmasını `config: false` ile kilitliyor,
// yani postcss.config.js okunmuyor. Tailwind'i build'e sokmanın yolu webpack
// config'ini genişletmek.
//
// Not: craco'nun `style.postcss.plugins` kısayolu burada kullanılamıyor.
// O yol postcssOptions.plugins'i bir fonksiyona çeviriyor, CRA'nın kullandığı
// postcss-loader sürümü ise fonksiyonu yok sayıp plugin'i hiç çalıştırmıyor —
// build hatasız geçiyor ama tek bir Tailwind utility'si üretilmiyor.
// Bu yüzden plugin'i doğrudan mevcut diziye ekliyoruz.

const tailwind = require('tailwindcss')({
  config: path.join(__dirname, 'tailwind.config.js'),
});

function addTailwindToPostcssLoaders(rules) {
  let patched = 0;

  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;

    if (Array.isArray(rule.oneOf)) {
      patched += addTailwindToPostcssLoaders(rule.oneOf);
    }

    if (Array.isArray(rule.use)) {
      patched += addTailwindToPostcssLoaders(rule.use);
    }

    const isPostcssLoader =
      typeof rule.loader === 'string' && rule.loader.includes('postcss-loader');

    if (isPostcssLoader && rule.options && rule.options.postcssOptions) {
      const postcssOptions = rule.options.postcssOptions;

      if (Array.isArray(postcssOptions.plugins)) {
        postcssOptions.plugins.push(tailwind);
        patched += 1;
      }
    }
  }

  return patched;
}

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const patched = addTailwindToPostcssLoaders(webpackConfig.module.rules);

      if (patched === 0) {
        throw new Error(
          'craco: Tailwind hiçbir postcss-loader kuralına eklenemedi. ' +
            'react-scripts webpack config yapısı değişmiş olabilir.'
        );
      }

      return webpackConfig;
    },
  },
};
