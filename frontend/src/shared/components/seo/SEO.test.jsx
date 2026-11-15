import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEO, { toAbsoluteUrl } from './SEO';

const ogImages = () => [...document.head.querySelectorAll('meta[property="og:image"]')].map((m) => m.content);

describe('SEO', () => {
  test('toAbsoluteUrl makes share images absolute', () => {
    expect(toAbsoluteUrl('/assets/x.jpg')).toBe('https://macsclub.com.tr/assets/x.jpg');
    expect(toAbsoluteUrl('https://api.macsclub.com.tr/uploads/a.webp')).toBe('https://api.macsclub.com.tr/uploads/a.webp');
    expect(toAbsoluteUrl(undefined)).toBe('https://macsclub.com.tr/assets/images/og-image.jpg');
  });

  test('page tags replace the static index.html defaults instead of duplicating them', async () => {
    // index.html'deki varsayılanın aynısı.
    const meta = document.createElement('meta');
    meta.setAttribute('data-rh', 'true');
    meta.setAttribute('property', 'og:image');
    meta.setAttribute('content', 'https://macsclub.com.tr/assets/images/og-image.jpg');
    document.head.appendChild(meta);

    render(
      <HelmetProvider>
        <SEO title="Proje" image="/assets/images/projects/p.webp" />
      </HelmetProvider>
    );

    await waitFor(() => expect(ogImages()).toEqual(['https://macsclub.com.tr/assets/images/projects/p.webp']));
  });
});
