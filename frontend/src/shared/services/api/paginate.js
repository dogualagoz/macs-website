/**
 * Backend liste uçları sayfalı: limit'in varsayılanı küçük (public 10, admin 50)
 * ve tavanı var (public 100, admin 200). Parametresiz çağrı sessizce yalnızca
 * ilk sayfayı döndürüyor; "tümü" isteyen çağıranlar sayfaları dolaşmalı.
 *
 * @param {(skip: number, limit: number) => Promise<{ items: unknown[], total?: number }>} fetchPage
 * @param {number} pageSize - Uç noktanın kabul ettiği en büyük limit
 * @returns {Promise<unknown[]>}
 */
export async function fetchAllPages(fetchPage, pageSize) {
  const all = [];
  // Üst sınır: bozuk bir total ya da hep dolu dönen bir uç sonsuz döngüye sokmasın.
  const MAX_PAGES = 1000;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { items, total } = await fetchPage(page * pageSize, pageSize);
    all.push(...items);

    if (items.length < pageSize) break;
    if (typeof total === 'number' && all.length >= total) break;
  }

  return all;
}
