/* eslint-disable no-script-url -- reddedilmesi gereken zararlı girdiler test ediliyor */
import { safeExternalUrl, isValidOptionalUrl } from './safeUrl';

describe('safeExternalUrl', () => {
  test.each([
    ['https://github.com/macs/site', 'https://github.com/macs/site'],
    ['http://example.com', 'http://example.com/'],
    ['  https://forms.gle/abc  ', 'https://forms.gle/abc'],
    ['github.com/macs', 'https://github.com/macs'],
    ['//maps.google.com/?q=1', 'https://maps.google.com/?q=1'],
  ])('allows %s', (input, expected) => {
    expect(safeExternalUrl(input)).toBe(expected);
  });

  test.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    ' \u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'mailto:a@b.c',
    'not a url',
    '',
    null,
    undefined,
    42,
  ])('rejects %p', (input) => {
    expect(safeExternalUrl(input)).toBeNull();
  });
});

describe('isValidOptionalUrl', () => {
  test('empty is valid, unsafe is not', () => {
    expect(isValidOptionalUrl('')).toBe(true);
    expect(isValidOptionalUrl('https://x.org')).toBe(true);
    expect(isValidOptionalUrl('javascript:alert(1)')).toBe(false);
  });
});
