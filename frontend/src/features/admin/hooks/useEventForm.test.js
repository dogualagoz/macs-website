import { renderHook, act } from '@testing-library/react';
import apiClient from '../../../shared/services/api/apiClient';
import { useEventForm } from './useEventForm';

jest.mock('../../../shared/services/api/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('useEventForm edit keeps start_time', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.put.mockResolvedValue({ data: { id: 7 } });
  });

  test('shows Istanbul time and saves the same instant back', async () => {
    const editData = {
      id: 7,
      title: 'Etkinlik',
      start_time: '2026-11-20T15:00:00', // API: UTC 15:00 = TR 18:00
      is_active: true,
    };

    const { result } = renderHook(() => useEventForm(editData));
    expect(result.current.formData.date).toBe('2026-11-20T18:00');

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      '/events/7',
      expect.objectContaining({ start_time: '2026-11-20T18:00:00+03:00' })
    );
  });
});
