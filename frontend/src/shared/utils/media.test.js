import { getMediaUrl, getInitialsAvatar } from './media';

jest.mock('../config/env', () => ({ __esModule: true, default: { apiUrl: 'https://api.macsclub.com.tr' } }));

describe('getMediaUrl', () => {
  test.each([
    ['/uploads/a.webp', 'https://api.macsclub.com.tr/uploads/a.webp'],
    ['uploads/a.webp', 'https://api.macsclub.com.tr/uploads/a.webp'],
    ['/static/uploads/a.webp', 'https://api.macsclub.com.tr/uploads/a.webp'],
    ['https://cdn.example.com/a.png', 'https://cdn.example.com/a.png'],
    ['/assets/images/x.png', '/assets/images/x.png'],
    ['assets/images/x.png', '/assets/images/x.png'],
  ])('%s -> %s', (input, expected) => {
    expect(getMediaUrl(input, 'Project')).toBe(expected);
  });

  test('missing content image falls back to the placeholder', () => {
    expect(getMediaUrl(null, 'Event')).toBe('/assets/images/img_source_code.webp');
  });

  test('missing avatar falls back to a local initials image', () => {
    expect(getMediaUrl(null, 'Ada Lovelace')).toMatch(/^data:image\/svg\+xml/);
  });
});

describe('getInitialsAvatar', () => {
  const text = (uri) => decodeURIComponent(uri.split(',')[1]).match(/>([^<]*)<\/text>/)[1];

  test('uses up to two initials, Turkish uppercase', () => {
    expect(text(getInitialsAvatar('ilker şahin yılmaz'))).toBe('İŞ');
  });

  test('never contacts a third-party service and is safe inside url()', () => {
    const uri = getInitialsAvatar('<b>"x"</b> (y)');
    expect(uri).not.toMatch(/ui-avatars|https?:\/\/(?!www\.w3\.org)/);
    expect(uri).not.toMatch(/[()'"\s]/);
    expect(text(uri)).toBe('BY'); // yalnızca harfler alınır, etiket metne sızmaz
  });

  test('empty name gets a placeholder', () => {
    expect(text(getInitialsAvatar(''))).toBe('?');
  });
});
