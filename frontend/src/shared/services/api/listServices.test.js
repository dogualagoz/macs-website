import apiClient from './apiClient';
import eventService from './eventService';
import sponsorService from './sponsorService';
import memberService from './memberService';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const rows = (n, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: offset + i + 1 }));

describe('list services fetch every page', () => {
  beforeEach(() => jest.clearAllMocks());

  test('eventService.getAll walks past the backend default of 10', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: rows(100) })
      .mockResolvedValueOnce({ data: rows(7, 100) });

    const events = await eventService.getAll();

    expect(events).toHaveLength(107);
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/events?limit=100');
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/events?skip=100&limit=100');
  });

  test('explicit limit still returns a single page', async () => {
    apiClient.get.mockResolvedValueOnce({ data: rows(3) });
    await expect(eventService.getAll({ limit: 3 })).resolves.toHaveLength(3);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  test('sponsorService.getAllAdmin includes inactive sponsors', async () => {
    apiClient.get.mockImplementation(async (_url, { params }) => ({
      data: params.is_active ? [{ id: 1, is_active: true }] : [{ id: 2, is_active: false }],
    }));

    const sponsors = await sponsorService.getAllAdmin();

    expect(sponsors.map((s) => s.id)).toEqual([1, 2]);
    expect(apiClient.get).toHaveBeenCalledWith('/sponsors/', { params: { is_active: false, skip: 0, limit: 200 } });
  });

  test('memberService.getAll walks past the backend default of 50', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: rows(200) })
      .mockResolvedValueOnce({ data: rows(1, 200) });

    await expect(memberService.getAll()).resolves.toHaveLength(201);
  });
});
