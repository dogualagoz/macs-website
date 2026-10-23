import { fireEvent, render, screen } from '@testing-library/react';
import { Code, Heart } from 'lucide-react';
import ProjectsToolbar from './ProjectsToolbar';

const tabs = [
  { id: 'developed', label: 'Developed by MACS', icon: Code, count: 10 },
  { id: 'supported', label: 'Supported by MACS', icon: Heart, count: 1 },
];

function setup(overrides = {}) {
  const props = {
    tabs,
    activeTab: 'developed',
    onTabChange: jest.fn(),
    categories: ['All', 'Web', 'Mobil'],
    selectedCategory: 'All',
    onCategoryChange: jest.fn(),
    searchQuery: '',
    onSearchChange: jest.fn(),
    resultCount: 7,
    ...overrides,
  };
  render(<ProjectsToolbar {...props} />);
  return props;
}

test('aktif sekme ve kategori aria-pressed ile işaretlenir', () => {
  setup({ selectedCategory: 'Web' });
  expect(screen.getByRole('button', { name: 'Developed by MACS' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Supported by MACS' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: 'Web' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Tümü' }).getAttribute('aria-pressed')).toBe('false');
});

test('sekme, kategori ve arama değişimleri üst bileşene iletilir', () => {
  const props = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Supported by MACS' }));
  expect(props.onTabChange).toHaveBeenCalledWith('supported');
  fireEvent.click(screen.getByRole('button', { name: 'Mobil' }));
  expect(props.onCategoryChange).toHaveBeenCalledWith('Mobil');
  fireEvent.change(screen.getByRole('searchbox', { name: 'Proje ara' }), { target: { value: 'bot' } });
  expect(props.onSearchChange).toHaveBeenCalledWith('bot');
});

test('sonuç sayısı canlı bölgede yazılır ve çubuk blur kullanmaz', () => {
  setup();
  expect(screen.getByText('7 proje').getAttribute('aria-live')).toBe('polite');
  const bar = screen.getByRole('group', { name: 'Proje türü' }).parentElement?.parentElement;
  expect(bar?.className).not.toMatch(/backdrop-blur|sticky/);
});

test('sekmeler proje sayısını gösterir, ekran okuyucu adı yalnızca etiket olur', () => {
  setup();
  const tab = screen.getByRole('button', { name: 'Developed by MACS' });
  expect(tab.textContent).toBe('Developed by MACS10');
  expect(screen.getByRole('button', { name: 'Supported by MACS' }).textContent).toBe('Supported by MACS1');
});
