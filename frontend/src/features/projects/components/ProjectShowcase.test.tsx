import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MutableRefObject } from 'react';
import type { GlassFoldLive } from 'components/ui/glass-fold';
import { ProjectShowcase, SHOWCASE_ACCENTS, ShowcaseProject } from './ProjectShowcase';

// Yay gerçek zamanlı çalışır; bu dosyada kartlar hedef konuma anında oturur.
// Yayın kendisi ProjectShowcase.spring.test.tsx'te sınanır.
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  useSpring: (source: unknown) => source,
}));

class TestPointerEvent extends MouseEvent {
  pointerType: string;
  pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerType?: string; pointerId?: number } = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? 'mouse';
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', { value: TestPointerEvent, configurable: true });
});

const projects: ShowcaseProject[] = Array.from({ length: 7 }, (_, index) => ({
  id: index,
  slug: `project-${index}`,
  title: `Project ${index}`,
  shortDescription: `Description ${index}`,
  imageUrl: `/project-${index}.png`,
}));

function setup(items = projects, live?: MutableRefObject<GlassFoldLive>) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProjectShowcase projects={items} live={live} />
    </MemoryRouter>
  );
}

const activeLink = () => screen.getByRole('link', { name: /Projeyi incele/ });
const stageOf = () => screen.getByRole('region', { name: 'Projelere göz at' });
const offsetOf = (title: string) => {
  const card = screen.getByText(title, { selector: 'h2' }).closest('article');
  return Number(card?.style.getPropertyValue('--offset'));
};

test('yan kart seçilince merkez ve detay bağlantısı seçilen projeye geçer', () => {
  setup();
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-0');
  fireEvent.click(screen.getByRole('button', { name: 'Project 2 projesini öne getir' }));
  const link = activeLink();
  expect(link.getAttribute('href')).toBe('/projeler/project-2');
  expect(link.closest('article')?.style.getPropertyValue('--offset')).toBe('0');
  expect(screen.getAllByRole('article')).toHaveLength(5);
});

test('klavyeyle gezinme liste sınırından döner, altta gezinme okları bulunmaz', () => {
  setup();
  const stage = stageOf();
  fireEvent.keyDown(stage, { key: 'ArrowLeft' });
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-6');
  fireEvent.keyDown(stage, { key: 'ArrowRight' });
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-0');
  expect(screen.queryByRole('button', { name: 'Sonraki proje' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Tüm projeler/ })).toBeNull();
  expect(screen.getByRole('heading', { level: 1 }).className).toBe('project-showcase__title');
});

test('başlık harflere bölünse de tek bir erişilebilir ad taşır', () => {
  setup();
  expect(screen.getByRole('heading', { level: 1, name: 'MACS Projeleri' })).toBeTruthy();
});

test('yatay scroll projeyi değiştirir, dikey scroll sayfaya bırakılır', () => {
  setup();
  const stage = stageOf();
  expect(fireEvent.wheel(stage, { deltaX: 0, deltaY: 120 })).toBe(true);
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-0');
  expect(fireEvent.wheel(stage, { deltaX: 100, deltaY: 0 })).toBe(false);
  expect(offsetOf('Project 0')).toBeCloseTo(-1 / 3);
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-0');
  fireEvent.wheel(stage, { deltaX: 100, deltaY: 0 });
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-1');
});

test('Shift ve fare tekerleği ile yatay gezinilir', () => {
  setup();
  fireEvent.wheel(stageOf(), { deltaY: -200, shiftKey: true });
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-6');
});

test('küçük kaydırmalar eşiksiz ilerler ve ters kaydırma aynı konuma döner', () => {
  setup();
  const stage = stageOf();
  fireEvent.wheel(stage, { deltaX: 15 });
  expect(offsetOf('Project 0')).toBeCloseTo(-0.05);
  fireEvent.wheel(stage, { deltaX: -15 });
  expect(offsetOf('Project 0')).toBeCloseTo(0);
});

test('scroll durunca V en yakın karta oturur', () => {
  jest.useFakeTimers();
  try {
    setup();
    fireEvent.wheel(stageOf(), { deltaX: 100 });
    expect(offsetOf('Project 0')).toBeCloseTo(-1 / 3);
    act(() => { jest.advanceTimersByTime(200); });
    expect(offsetOf('Project 0')).toBe(0);
    expect(activeLink().getAttribute('href')).toBe('/projeler/project-0');
  } finally {
    jest.useRealTimers();
  }
});

test('mobilde sola kaydırma sonraki projeyi seçer', () => {
  setup();
  const stage = stageOf();
  fireEvent.touchStart(stage, { touches: [{ clientX: 250, clientY: 100 }] });
  fireEvent.touchMove(stage, { touches: [{ clientX: 100, clientY: 100 }] });
  fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 100 }] });
  expect(activeLink().getAttribute('href')).toBe('/projeler/project-1');
});

describe('fare ile sürükleme', () => {
  beforeEach(() => {
    jest.spyOn(performance, 'now').mockReturnValue(1000);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sürükleme kartları taşır ve bırakınca en yakın karta oturur', () => {
    setup();
    const stage = stageOf();
    fireEvent.pointerDown(stage, { pointerType: 'mouse', button: 0, buttons: 1, clientX: 400, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerType: 'mouse', buttons: 1, clientX: 250, clientY: 100 });
    expect(stage.dataset.dragging).toBe('true');
    expect(offsetOf('Project 0')).toBeCloseTo(-0.5);
    fireEvent.pointerMove(stage, { pointerType: 'mouse', buttons: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerType: 'mouse', clientX: 100, clientY: 100 });
    expect(stage.dataset.dragging).toBeUndefined();
    expect(activeLink().getAttribute('href')).toBe('/projeler/project-1');
    expect(offsetOf('Project 1')).toBe(0);
  });

  test('sürükleme sonundaki click altındaki karta gitmez', () => {
    setup();
    const stage = stageOf();
    fireEvent.pointerDown(stage, { pointerType: 'mouse', button: 0, buttons: 1, clientX: 400, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerType: 'mouse', buttons: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerType: 'mouse', clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Project 3 projesini öne getir' }));
    expect(activeLink().getAttribute('href')).toBe('/projeler/project-1');
  });

  test('kıpırdamadan tıklamak yan kartı seçmeye devam eder', () => {
    setup();
    const stage = stageOf();
    fireEvent.pointerDown(stage, { pointerType: 'mouse', button: 0, buttons: 1, clientX: 400, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerType: 'mouse', buttons: 1, clientX: 402, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerType: 'mouse', clientX: 402, clientY: 100 });
    fireEvent.click(screen.getByRole('button', { name: 'Project 2 projesini öne getir' }));
    expect(activeLink().getAttribute('href')).toBe('/projeler/project-2');
  });
});

test('açılışta kartlar merkezde üst üste başlar', () => {
  setup();
  const card = screen.getByText('Project 1', { selector: 'h2' }).closest('article');
  expect(card?.style.getPropertyValue('--reveal')).toBe('0');
});

test('görseli yüklenemeyen proje boş kutu yerine baş harfli yüzey gösterir', () => {
  const { container } = setup();
  fireEvent.error(container.querySelector('img[alt="Project 0"]') as HTMLImageElement);
  expect(container.querySelector('img[alt="Project 0"]')).toBeNull();
  expect(container.querySelector('.project-showcase__placeholder')?.textContent).toBe('P0');
});

test('sayaç aktif projeyi gösterir ve gezinince rakamları kaydırır', () => {
  const { container } = setup();
  const digit = () => container.querySelector<HTMLElement>('.project-showcase__digit-strip')?.style.getPropertyValue('--digit');
  expect(digit()).toBe('1');
  fireEvent.keyDown(stageOf(), { key: 'ArrowRight' });
  expect(digit()).toBe('2');
  expect(container.querySelector('.project-showcase__count-total')?.textContent).toBe('/ 7');
});

test('arka plana aktif projenin vurgu rengi ve hareket enerjisi aktarılır', () => {
  const live = { current: { energy: 0 } } as MutableRefObject<GlassFoldLive>;
  setup(projects, live);
  expect(live.current.color3).toBe(SHOWCASE_ACCENTS[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Project 2 projesini öne getir' }));
  expect(live.current.color3).toBe(SHOWCASE_ACCENTS[2]);
  expect(Number.isFinite(live.current.energy)).toBe(true);
});

test('vitrin ekrandan çıkınca arka plan durur, dönünce uyandırılır', () => {
  let notify: (entry: { isIntersecting: boolean; intersectionRatio: number }) => void = () => {};
  const disconnect = jest.fn();
  class FakeIntersectionObserver {
    constructor(callback: (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void) {
      notify = (entry) => callback([entry]);
    }
    observe() {}
    disconnect = disconnect;
  }
  Object.defineProperty(window, 'IntersectionObserver', { value: FakeIntersectionObserver, configurable: true });
  const wake = jest.fn();
  const live = { current: { energy: 0, wake } } as MutableRefObject<GlassFoldLive>;
  const { unmount } = setup(projects, live);
  act(() => notify({ isIntersecting: false, intersectionRatio: 0 }));
  expect(live.current.paused).toBe(true);
  expect(wake).not.toHaveBeenCalled();
  // Header altında kalan dar şerit: kesişiyor ama görünür sayılmaz.
  act(() => notify({ isIntersecting: true, intersectionRatio: 0.09 }));
  expect(live.current.paused).toBe(true);
  act(() => notify({ isIntersecting: true, intersectionRatio: 0.6 }));
  expect(live.current.paused).toBe(false);
  expect(wake).toHaveBeenCalledTimes(1);
  unmount();
  expect(disconnect).toHaveBeenCalled();
  delete (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver;
});

test('boş listeyi ve tek projeyi çoğaltmadan gösterir', () => {
  const { unmount } = setup([]);
  expect(screen.getByText('Henüz yayınlanmış proje yok.')).toBeTruthy();
  unmount();
  setup(projects.slice(0, 1));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Sonraki proje' })).toBeNull();
});
