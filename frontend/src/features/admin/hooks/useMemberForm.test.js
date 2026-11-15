import { renderHook, act, waitFor } from '@testing-library/react';
import apiClient from '../../../shared/services/api/apiClient';
import { useMemberForm } from './useMemberForm';

jest.mock('../../../shared/services/api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const file = new File(['x'], 'p.png', { type: 'image/png' });

describe('useMemberForm', () => {
  beforeEach(() => jest.clearAllMocks());

  test('selecting a photo does not upload until the form is saved', async () => {
    apiClient.post.mockImplementation(async (url) =>
      url === '/api/upload/' ? { data: { url: '/uploads/p.webp' } } : { data: { id: 1 } }
    );
    const { result } = renderHook(() => useMemberForm());

    act(() => result.current.handleImageChange(file));
    await waitFor(() => expect(result.current.imagePreview).toMatch(/^data:/));
    expect(apiClient.post).not.toHaveBeenCalled();

    act(() => result.current.handleChange('fullName', 'Ada Lovelace'));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/upload/', expect.any(FormData), expect.anything());
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/members', {
      full_name: 'Ada Lovelace',
      profile_image: '/uploads/p.webp',
      is_active: true,
    });
  });

  test('edit without a new photo keeps the existing one', async () => {
    apiClient.put.mockResolvedValue({ data: { id: 5 } });
    const editData = { id: 5, full_name: 'Ada', profile_image: '/uploads/a.webp', is_active: true };
    const { result } = renderHook(() => useMemberForm(editData));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(apiClient.put).toHaveBeenCalledWith('/members/5', expect.objectContaining({ profile_image: '/uploads/a.webp' }));
  });

  test('backend error detail reaches the form', async () => {
    apiClient.post.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'Bu isimde aktif üye var' } } });
    const { result } = renderHook(() => useMemberForm());

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(result.current.error).toBe('Bu isimde aktif üye var');
  });
});
