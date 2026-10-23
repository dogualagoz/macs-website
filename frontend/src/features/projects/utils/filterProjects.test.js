import { ALL_TAB, countByTab, filterProjects, matchesTab } from './filterProjects';

const make = (id, project_type, extra = {}) => ({
  id, title: `Proje ${id}`, project_type, tags: [], category: 'Web', ...extra,
});

// Canlı dağılım: 10 Developed, 1 Supported, 12 Member Showcase.
const projects = [
  ...Array.from({ length: 10 }, (_, i) => make(i + 1, 'DEVELOPED_BY_MACS')),
  make(11, 'SUPPORTED_BY_MACS'),
  ...Array.from({ length: 12 }, (_, i) => make(12 + i, 'MEMBER_SHOWCASE')),
];
const base = { tab: ALL_TAB, search: '', category: 'All' };

test('tümü sekmesi bütün projeleri gösterir, tür sekmeleri yalnızca kendi türünü', () => {
  expect(filterProjects(projects, base)).toHaveLength(23);
  expect(filterProjects(projects, { ...base, tab: 'developed' })).toHaveLength(10);
  expect(filterProjects(projects, { ...base, tab: 'supported' })).toHaveLength(1);
  expect(filterProjects(projects, { ...base, tab: 'showcase' })).toHaveLength(12);
});

test('sekme sayıları toplamı tümü sayısına eşittir', () => {
  const counts = countByTab(projects, [ALL_TAB, 'developed', 'supported', 'showcase']);
  expect(counts).toEqual({ all: 23, developed: 10, supported: 1, showcase: 12 });
  expect(counts.developed + counts.supported + counts.showcase).toBe(counts.all);
});

test('arama başlık ve etikete, kategori ad ya da nesne olarak eşleşir', () => {
  const list = [
    make(1, 'DEVELOPED_BY_MACS', { title: 'AI Chatbot', tags: ['Python'] }),
    make(2, 'DEVELOPED_BY_MACS', { title: 'Web Sitesi', tags: ['React'], category: { name: 'Mobil' } }),
  ];
  expect(filterProjects(list, { ...base, search: 'chat' }).map((p) => p.id)).toEqual([1]);
  expect(filterProjects(list, { ...base, search: 'react' }).map((p) => p.id)).toEqual([2]);
  expect(filterProjects(list, { ...base, category: 'Mobil' }).map((p) => p.id)).toEqual([2]);
  expect(filterProjects(list, { ...base, category: 'Web' }).map((p) => p.id)).toEqual([1]);
});

test('project_type yoksa eski tab alanıyla eşleşir (mock veri)', () => {
  expect(matchesTab({ tab: 'supported' }, 'supported')).toBe(true);
  expect(matchesTab({ tab: 'supported' }, 'developed')).toBe(false);
  expect(matchesTab({}, ALL_TAB)).toBe(true);
});
