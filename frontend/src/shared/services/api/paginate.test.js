import { fetchAllPages } from './paginate';

const pager = (rows, { withTotal = false } = {}) =>
  jest.fn(async (skip, limit) => ({
    items: rows.slice(skip, skip + limit),
    total: withTotal ? rows.length : undefined,
  }));

describe('fetchAllPages', () => {
  const rows = Array.from({ length: 250 }, (_, i) => i);

  test('walks pages until a short page (array endpoints)', async () => {
    const fetchPage = pager(rows);
    await expect(fetchAllPages(fetchPage, 100)).resolves.toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  test('stops at total without an extra empty request', async () => {
    const fetchPage = pager(rows.slice(0, 200), { withTotal: true });
    await expect(fetchAllPages(fetchPage, 100)).resolves.toHaveLength(200);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test('empty first page returns empty list', async () => {
    await expect(fetchAllPages(pager([]), 100)).resolves.toEqual([]);
  });
});
