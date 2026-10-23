import { render, screen } from '@testing-library/react';
import ProjectsPageSkeleton from './ProjectsPageSkeleton';

test('yükleniyor durumunu tek bir canlı bölge olarak duyurur, görsel kısım gizlidir', () => {
  const { container } = render(<ProjectsPageSkeleton />);
  const status = screen.getByRole('status');
  expect(status.getAttribute('aria-busy')).toBe('true');
  expect(screen.getByText('Projeler yükleniyor…').className).toBe('sr-only');
  expect(status.querySelector('[aria-hidden="true"]')).toBeTruthy();
  expect(container.querySelectorAll('button, a, input')).toHaveLength(0);
});

test('vitrin iskeleti gerçek V ile aynı geometriyi kullanır', () => {
  const { container } = render(<ProjectsPageSkeleton />);
  const cards = [...container.querySelectorAll('.project-showcase__card')];
  expect(cards.map((card) => card.style.getPropertyValue('--offset'))).toEqual(['-2', '-1', '0', '1', '2']);
  const center = cards[2];
  expect(center.style.getPropertyValue('--focus')).toBe('1');
  expect(center.style.getPropertyValue('--reveal')).toBe('1');
  // Merkez en önde, kollar geride.
  expect(Number(center.style.zIndex)).toBeGreaterThan(Number(cards[0].style.zIndex));
  // Yalnızca merkez kartın açıklama satırları var.
  expect(center.querySelectorAll('.skeleton-line')).toHaveLength(3);
  expect(cards[0].querySelectorAll('.skeleton-line')).toHaveLength(1);
});

test('filtre çubuğu ve mozaik iskeleti alt bölümle aynı ızgarayı taşır', () => {
  const { container } = render(<ProjectsPageSkeleton />);
  const grid = container.querySelector('.xl\\:grid-cols-4');
  expect(grid).toBeTruthy();
  // 1 öne çıkan + 7 kart; biri geniş, öne çıkan 2x2.
  expect(grid.children).toHaveLength(8);
  expect(grid.querySelectorAll('.xl\\:row-span-2')).toHaveLength(1);
  expect(grid.querySelectorAll('.sm\\:col-span-2')).toHaveLength(2);
  expect(container.querySelectorAll('.projects-skeleton__tab')).toHaveLength(3);
  expect(container.innerHTML).not.toMatch(/backdrop-blur/);
});
