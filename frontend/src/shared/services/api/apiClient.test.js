import { isSessionExpiry, handleResponseError } from './apiClient';

const error401 = (config) => ({ response: { status: 401, data: { detail: 'x' } }, config });

describe('401 handling', () => {
  test('wrong password on login is not treated as session expiry', () => {
    expect(isSessionExpiry(error401({ url: '/auth/login', headers: {} }))).toBe(false);
  });

  test('401 on a request that carried a token is session expiry', () => {
    expect(isSessionExpiry(error401({ url: '/events/admin', headers: { Authorization: 'Bearer t' } }))).toBe(true);
  });

  test('401 without a token (public visitor) is not session expiry', () => {
    expect(isSessionExpiry(error401({ url: '/events', headers: {} }))).toBe(false);
  });

  test('other statuses are ignored', () => {
    expect(isSessionExpiry({ response: { status: 403 }, config: { headers: { Authorization: 'Bearer t' } } })).toBe(false);
  });

  test('login failure keeps the stored session untouched and rejects with the API error', async () => {
    localStorage.setItem('token', 'old');
    const err = error401({ url: '/auth/login', headers: {} });
    await expect(handleResponseError(err)).rejects.toBe(err);
    expect(localStorage.getItem('token')).toBe('old');
    localStorage.clear();
  });

  test('session expiry clears every auth key', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('token_exp', '1');
    localStorage.setItem('user', '{}');
    const err = error401({ url: '/users', headers: { Authorization: 'Bearer t' } });
    // jsdom navigasyonu uygulamıyor; konsola "not implemented" basmasın diye susturuluyor.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(handleResponseError(err)).rejects.toBe(err);
    spy.mockRestore();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token_exp')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
