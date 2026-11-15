import { renderHook, act } from '@testing-library/react';
import projectService from '../../../shared/services/api/projectService';
import { useProjectForm } from './useProjectForm';
import apiClient from '../../../shared/services/api/apiClient';

jest.mock('../../../shared/services/api/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('B01: admin project edit preserves API status enum', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.put.mockResolvedValue({ data: { id: 42 } });
  });

  test.each([
    ['PLANNING', 'Planlama Aşamasında'],
    ['IN_PROGRESS', 'Geliştirme Aşamasında'],
    ['COMPLETED', 'Tamamlandı'],
    ['ON_HOLD', 'Yayında'],
    ['CANCELLED', 'Yayında'],
  ])('maps %s to display label %s while submitting API enum %s on edit', async (apiEnum, expectedLabel) => {
    const mapped = projectService._mapProject({
      id: 42,
      title: 'Test Project',
      description: 'Desc',
      content: 'Content',
      technologies: 'React',
      status: apiEnum,
      project_type: 'DEVELOPED_BY_MACS',
      is_featured: false,
      is_active: true,
      members: [],
    });

    expect(mapped.status).toBe(expectedLabel);

    const { result } = renderHook(() => useProjectForm(mapped));
    expect(result.current.formData.status).toBe(apiEnum);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(apiClient.put).toHaveBeenCalledTimes(1);
    expect(apiClient.put).toHaveBeenCalledWith(
      '/projects/42',
      expect.objectContaining({ status: apiEnum })
    );
  });
});
