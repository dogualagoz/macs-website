import { responsiveImgProps, uploadSrcSet, withVariantFallback } from './responsiveImage';

const ID = '0b8c3f4e-1d2a-4b5c-8d9e-0f1a2b3c4d5e';

describe('uploadSrcSet', () => {
  it('builds 480/960/1600 webp candidates for an uploaded image', () => {
    expect(uploadSrcSet(`https://api.macsclub.com.tr/uploads/${ID}.png`)).toBe(
      `https://api.macsclub.com.tr/uploads/${ID}-480.webp 480w, ` +
        `https://api.macsclub.com.tr/uploads/${ID}-960.webp 960w, ` +
        `https://api.macsclub.com.tr/uploads/${ID}-1600.webp 1600w`
    );
  });

  it('ignores static assets, gifs, query strings and non-strings', () => {
    for (const url of ['/assets/images/x.png', `/uploads/${ID}.gif`, `/uploads/${ID}.png?v=1`, '/uploads/abc.png', null, undefined]) {
      expect(uploadSrcSet(url)).toBeUndefined();
    }
    expect(responsiveImgProps('/assets/a.png', '100vw')).toEqual({});
  });
});

describe('withVariantFallback', () => {
  it('drops srcset on the first error and calls onError on the next', () => {
    const img = document.createElement('img');
    img.setAttribute('srcset', 'a 480w');
    img.setAttribute('sizes', '100vw');
    const onError = jest.fn();
    const handler = withVariantFallback(onError);

    handler({ currentTarget: img });
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.hasAttribute('sizes')).toBe(false);
    expect(onError).not.toHaveBeenCalled();

    handler({ currentTarget: img });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
