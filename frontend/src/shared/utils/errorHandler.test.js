import { handleApiError, extractApiMessage, getValidationErrors } from './errorHandler';

const apiError = (status, data) => ({ isAxiosError: true, response: { status, data } });

describe('handleApiError', () => {
  test('shows the backend detail string', () => {
    expect(handleApiError(apiError(409, { detail: 'Bu slug zaten kullanılıyor' }))).toBe('Bu slug zaten kullanılıyor');
    expect(handleApiError(apiError(400, { detail: 'Admin kendi hesabını silemez' }))).toBe('Admin kendi hesabını silemez');
  });

  test('summarises FastAPI-style 422 detail arrays', () => {
    const err = apiError(422, { detail: [{ loc: ['body', 'title'], msg: 'Field required', type: 'missing' }] });
    expect(handleApiError(err)).toBe('title: Field required');
    expect(getValidationErrors(err)).toEqual({ title: 'Field required' });
  });

  test('falls back to generic text when the body has no message', () => {
    expect(handleApiError(apiError(500, {}))).toMatch(/Sunucu hatası/);
    expect(handleApiError(apiError(422, null))).toMatch(/geçerli değil/);
  });

  test('network errors ask the user to check the connection', () => {
    expect(handleApiError({ isAxiosError: true, message: 'Network Error' })).toMatch(/bağlantınızı/);
  });

  test('client-side validation errors keep their message', () => {
    expect(handleApiError(new Error('Lütfen zorunlu alanları doldurun'))).toBe('Lütfen zorunlu alanları doldurun');
  });

  test('extractApiMessage tolerates odd bodies', () => {
    expect(extractApiMessage('plain')).toBeNull();
    expect(extractApiMessage({ message: 'eski format' })).toBe('eski format');
  });
});
