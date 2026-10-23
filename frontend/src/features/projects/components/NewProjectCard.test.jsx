import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewProjectCard from './NewProjectCard';

// jsdom'da IntersectionObserver yok; whileInView bunu ister. Giriş hiç tetiklenmez.
beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const project = {
  id: 1,
  slug: 'ai-chatbot',
  title: 'AI Chatbot',
  shortDescription: 'Sohbet botu',
  imageUrl: '/chat.png',
  category: 'Yapay Zeka',
  tags: ['React', 'FastAPI', 'Docker', 'Redis'],
  team: [
    { id: 'a', name: 'Ayşe Yılmaz' }, { id: 'b', name: 'Can Demir' },
    { id: 'c', name: 'Deniz Kaya' }, { id: 'd', name: 'Efe Çelik' },
  ],
};

const renderCard = (variant) => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <NewProjectCard project={project} variant={variant} />
  </MemoryRouter>
);

test('kart tek bağlantıdır ve ağdan avatar çekmez', () => {
  const { container } = renderCard();
  const link = screen.getByRole('link', { name: /AI Chatbot/ });
  expect(link.getAttribute('href')).toBe('/projeler/ai-chatbot');
  expect(container.querySelectorAll('button')).toHaveLength(0);
  expect(container.querySelectorAll('img')).toHaveLength(1);
  expect(screen.getByTitle('Ayşe Yılmaz').textContent).toBe('AY');
  expect(screen.getByText('+1', { selector: 'span.flex' })).toBeTruthy();
  expect(screen.getByText('+1', { selector: 'span.rounded-md' })).toBeTruthy();
});

test('öne çıkan kutu rozet taşır, geniş kutu taşımaz; ikisi de blur kullanmaz', () => {
  const { container, unmount } = renderCard('featured');
  expect(screen.getByText('ÖNE ÇIKAN')).toBeTruthy();
  expect(container.innerHTML).not.toMatch(/backdrop-blur/);
  unmount();
  const wide = renderCard('wide');
  expect(screen.queryByText('ÖNE ÇIKAN')).toBeNull();
  expect(wide.container.innerHTML).not.toMatch(/backdrop-blur/);
});

test('kart ekrana girmeden önce gizli başlar, böylece girişte yaylı animasyonla gelir', () => {
  renderCard();
  // Sahte gözlemci hiç tetiklenmez: kart başlangıç halinde kalır.
  const link = screen.getByRole('link', { name: /AI Chatbot/ });
  expect(link.style.opacity).toBe('0');
  expect(link.style.transform).toMatch(/translateY\(56px\)/);
});
