import {
  CSSProperties,
  MouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  MotionValue,
  animate,
  motionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import type { GlassFoldLive } from 'components/ui/glass-fold';
import '../../../styles/components/project-showcase.css';

export interface ShowcaseProject {
  id: string | number;
  slug: string;
  title: string;
  shortDescription: string;
  imageUrl: string;
  [key: string]: unknown;
}

/** Her projeye sırayla verilen vurgu rengi: kart parıltısı ve arka plan kenar ışığı. */
export const SHOWCASE_ACCENTS = ['#ff9a3d', '#b57cff', '#7ddc5a', '#ff5d5d', '#3dd6c6', '#ffd23d'] as const;

const accentOf = (index: number) => SHOWCASE_ACCENTS[index % SHOWCASE_ACCENTS.length];
const mod = (value: number, size: number) => ((value % size) + size) % size;
const round4 = (value: number) => Math.round(value * 1e4) / 1e4;

/** index'in konumdan sapması, liste döngüsel olduğundan [-count/2, count/2) aralığına sarılır. */
const wrapOffset = (index: number, position: number, count: number) =>
  count < 2 ? 0 : mod(index - position + count / 2, count) - count / 2;

const POSITION_SPRING = { stiffness: 140, damping: 24, mass: 1, restDelta: 0.0005 };
const TILT_SPRING = { type: 'spring', stiffness: 170, damping: 18 } as const;
/** Fare/dokunma bırakıldığında hızın ne kadar öne taşınacağı (saniye) ve en fazla kaç kart atlanacağı. */
const MOMENTUM_SECONDS = 0.18;
const MAX_MOMENTUM_STEPS = 3;
const DRAG_THRESHOLD = 4;
const SHADER_VISIBLE_RATIO = 0.15;

interface DragState {
  x: number;
  y: number;
  position: number;
  touch: boolean;
  moved: boolean;
  samples: Array<{ t: number; p: number }>;
}

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/**
 * V duruşunun CSS değişkenleri; geometri project-showcase.css'te hesaplanır.
 * Yükleme iskeleti de aynı fonksiyonu kullanır, böylece iki görünüm birebir oturur.
 */
export function showcasePose(offset: number, reveal = 1) {
  const depth = Math.min(Math.abs(offset), 3);
  return {
    vars: {
      '--offset': offset,
      '--depth': depth,
      // Orta bölge yumuşak, kollar sert: derinlik 2'de eski doğrusal V ile aynı yüksekliğe ulaşır.
      '--lift': 2 * Math.pow(depth / 2, 1.3),
      '--focus': Math.max(0, 1 - depth),
      '--fade': Math.max(0, Math.min(1, (2.6 - depth) / 1.1)),
      '--blur': Math.max(depth - 1, 0) * 1.2,
      '--reveal': reveal,
    } as Record<string, number>,
    zIndex: 100 - Math.round(depth * 10),
  };
}

function applyPose(element: HTMLElement, offset: number, reveal: number) {
  const { vars, zIndex } = showcasePose(offset, reveal);
  Object.entries(vars).forEach(([name, value]) => element.style.setProperty(name, String(round4(value))));
  element.style.zIndex = String(zIndex);
}

const getStep = (stage: HTMLElement) => Number.parseFloat(window.getComputedStyle(stage).columnGap) || 300;

function initialsOf(title: string) {
  const letters = title.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('');
  return letters.toLocaleUpperCase('tr-TR') || '?';
}

function CardTilt({ cardRef }: { cardRef: RefObject<HTMLElement> }) {
  useEffect(() => {
    const card = cardRef.current;
    const canHover = typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
    if (!card || !canHover) return;
    const tiltX = motionValue(0);
    const tiltY = motionValue(0);
    const glow = motionValue(0);
    const write = (name: string) => (value: number) => card.style.setProperty(name, String(round4(value)));
    const stops = [
      tiltX.on('change', write('--tilt-x')),
      tiltY.on('change', write('--tilt-y')),
      glow.on('change', write('--glow')),
    ];
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      animate(tiltY, (px - 0.5) * 12, TILT_SPRING);
      animate(tiltX, (0.5 - py) * 9, TILT_SPRING);
      animate(glow, 1, TILT_SPRING);
      card.style.setProperty('--glare-x', `${round4(px * 100)}%`);
      card.style.setProperty('--glare-y', `${round4(py * 100)}%`);
    };
    const onLeave = () => {
      animate(tiltX, 0, TILT_SPRING);
      animate(tiltY, 0, TILT_SPRING);
      animate(glow, 0, TILT_SPRING);
    };
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);
    return () => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      stops.forEach((stop) => stop());
      ['--tilt-x', '--tilt-y', '--glow', '--glare-x', '--glare-y'].forEach((name) => card.style.removeProperty(name));
    };
  }, [cardRef]);

  return <div className="project-showcase__glare" aria-hidden="true" />;
}

interface ShowcaseCardProps {
  project: ShowcaseProject;
  index: number;
  count: number;
  driver: MotionValue<number>;
  current: boolean;
  inView: boolean;
  reachable: boolean;
  accent: string;
  reduced: boolean;
  onSelect: (index: number) => void;
}

function ShowcaseCard({
  project, index, count, driver, current, inView, reachable, accent, reduced, onSelect,
}: ShowcaseCardProps) {
  const ref = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const reveal = useMotionValue(reduced ? 1 : 0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const render = () => applyPose(element, wrapOffset(index, driver.get(), count), reveal.get());
    render();
    const stops = [driver.on('change', render), reveal.on('change', render)];
    return () => stops.forEach((stop) => stop());
  }, [driver, reveal, index, count]);

  // Açılış: kartlar merkezde üst üste başlar, ortadan dışa doğru V'ye açılır.
  useEffect(() => {
    if (reduced) {
      reveal.set(1);
      return;
    }
    const controls = animate(reveal, 1, {
      type: 'spring',
      stiffness: 90,
      damping: 15,
      delay: 0.12 + Math.min(Math.abs(wrapOffset(index, driver.get(), count)), 3) * 0.07,
    });
    return () => controls.stop();
  }, [reduced, reveal, driver, index, count]);

  const href = `/projeler/${project.slug}`;
  // Paylaşılan öğe geçişi: tarayıcı destekliyorsa kart görseli detay kapağına büyür.
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    const doc = document as ViewTransitionDocument;
    if (reduced || !doc.startViewTransition || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    doc.startViewTransition(() => {
      flushSync(() => navigate(href, { state: { project } }));
    });
  };

  return (
    <article
      ref={ref}
      className={`project-showcase__card${current ? ' is-active' : ''}`}
      aria-hidden={!reachable}
      data-visible={inView}
      style={{ '--accent': accent, visibility: inView ? 'visible' : 'hidden' } as CSSProperties}
    >
      <div
        className="project-showcase__image"
        style={current ? ({ viewTransitionName: 'project-hero' } as CSSProperties) : undefined}
      >
        {failed ? (
          <div className="project-showcase__placeholder" role="img" aria-label={project.title}>
            <span aria-hidden="true">{initialsOf(project.title)}</span>
          </div>
        ) : (
          <img
            src={project.imageUrl}
            alt={project.title}
            loading={reachable ? 'eager' : 'lazy'}
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      {current && <CardTilt cardRef={ref} />}
      <div className="project-showcase__caption">
        <h2>{project.title}</h2>
        <p>{project.shortDescription}</p>
        {current && (
          <Link
            to={href}
            state={{ project }}
            className="project-showcase__link"
            draggable={false}
            onClick={open}
          >
            <span className="project-showcase__link-label">Projeyi incele</span>
            <span className="project-showcase__link-arrow" aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
      {!current && reachable && (
        <button
          type="button"
          className="project-showcase__select"
          aria-label={`${project.title} projesini öne getir`}
          onClick={() => onSelect(index)}
        />
      )}
    </article>
  );
}

function RollingNumber({ value, length }: { value: number; length: number }) {
  const digits = String(value).padStart(length, '0').split('');
  return (
    <span className="project-showcase__counter" aria-hidden="true">
      {digits.map((digit, position) => (
        <span key={position} className="project-showcase__digit">
          <span className="project-showcase__digit-strip" style={{ '--digit': Number(digit) } as CSSProperties}>
            {'0123456789'.split('').map((n) => <span key={n}>{n}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

const letters = (word: string, start: number) =>
  Array.from(word).map((char, position) => (
    <span key={position} className="project-showcase__char" style={{ '--i': start + position } as CSSProperties}>
      {char}
    </span>
  ));

export function ProjectShowcase({
  projects,
  live,
}: {
  projects: ShowcaseProject[];
  /** Arka plan shader'ına hareket enerjisi ve vurgu rengi aktarmak için. */
  live?: MutableRefObject<GlassFoldLive>;
}) {
  const reduced = useReducedMotion() ?? false;
  const count = projects.length || 1;
  const target = useMotionValue(0);
  const smooth = useSpring(target, POSITION_SPRING);
  // Hareket azaltma tercihinde yay yok: kartlar hedefe doğrudan oturur.
  const driver = reduced ? target : smooth;
  const [active, setActive] = useState(0);
  const [center, setCenter] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  useMotionValueEvent(target, 'change', (value) => setActive(mod(Math.round(value), count)));
  useMotionValueEvent(driver, 'change', (value) => {
    setCenter(mod(Math.round(value), count));
    thumbRef.current?.style.setProperty('--progress', String(round4(mod(value, count) / count)));
    if (live) live.current.energy = Math.min(3, Math.abs(driver.getVelocity()) * 0.5);
  });

  useEffect(() => {
    if (!live) return;
    live.current.color3 = accentOf(active);
  }, [live, active]);

  useEffect(() => () => {
    if (!live) return;
    live.current.energy = 0;
    live.current.color3 = undefined;
  }, [live]);

  // Vitrin ekrandan çıkınca arka plan shader'ı durur (son kare kalır); alttaki
  // içerikte GPU boşta kalır. Geri gelince kaldığı yerden sürer.
  useEffect(() => {
    const section = sectionRef.current;
    if (!live || !section || typeof IntersectionObserver === 'undefined') return;
    const signal = live.current;
    // Header'ın altında kalan dar şerit "görünür" sayılmaz: %15'in altı durdurur.
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= SHADER_VISIBLE_RATIO;
      signal.paused = !visible;
      if (visible) signal.wake?.();
    }, { threshold: [0, SHADER_VISIBLE_RATIO] });
    observer.observe(section);
    return () => {
      observer.disconnect();
      signal.paused = false;
    };
  }, [live]);

  const move = (direction: number) => target.set(Math.round(target.get()) + direction);
  const select = (index: number) => {
    const base = Math.round(target.get());
    target.set(base + wrapOffset(index, base, count));
  };

  const beginDrag = (x: number, y: number, touch: boolean) => {
    const position = target.get();
    drag.current = { x, y, position, touch, moved: false, samples: [{ t: performance.now(), p: position }] };
  };

  const updateDrag = (stage: HTMLElement, x: number, y: number) => {
    const state = drag.current;
    if (!state) return false;
    const distance = state.x - x;
    // Dikey hareket sayfa kaydırmasıdır; dokunmada yatay niyet netleşmeden vitrin oynamaz.
    if (state.touch && Math.abs(distance) <= Math.abs(state.y - y)) return false;
    if (Math.abs(distance) > DRAG_THRESHOLD) state.moved = true;
    const position = state.position + distance / getStep(stage);
    target.set(position);
    if (driver !== target) driver.jump(position);
    state.samples.push({ t: performance.now(), p: position });
    if (state.samples.length > 8) state.samples.shift();
    return true;
  };

  /** Bırakılınca son harekete göre ileriye taşır ve en yakın karta oturur. */
  const endDrag = () => {
    const state = drag.current;
    drag.current = null;
    if (!state) return false;
    const last = state.samples[state.samples.length - 1];
    const first = state.samples.find((sample) => last.t - sample.t < 120) ?? last;
    const span = last.t - first.t;
    // Bırakmadan önce duraksandıysa atış yok.
    const velocity = span > 8 && performance.now() - last.t < 80 ? ((last.p - first.p) / span) * 1000 : 0;
    const carry = Math.max(-MAX_MOMENTUM_STEPS, Math.min(MAX_MOMENTUM_STEPS, velocity * MOMENTUM_SECONDS));
    target.set(Math.round(target.get() + carry));
    return state.moved;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || projects.length < 2) return;
    let idle: ReturnType<typeof setTimeout>;
    const settle = () => target.set(Math.round(target.get()));
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const delta = horizontal ? event.deltaX : event.shiftKey ? event.deltaY : 0;
      if (!delta) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1;
      // Kesirli konum korunur: her piksel V'yi adımsız kaydırır, durunca en yakın karta oturur.
      target.set(target.get() + (delta * unit) / getStep(stage));
      clearTimeout(idle);
      idle = setTimeout(settle, 160);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stage.removeEventListener('wheel', onWheel);
      clearTimeout(idle);
    };
  }, [projects.length, target]);

  if (projects.length === 0) {
    return (
      <section className="project-showcase project-showcase--empty" aria-labelledby="projeler-baslik">
        <h1 id="projeler-baslik" className="project-showcase__title"><span className="text-white">MACS</span><span className="text-macs-accent font-medium"> Projeleri</span></h1>
        <p>Henüz yayınlanmış proje yok.</p>
      </section>
    );
  }

  const currentProject = projects[Math.min(active, projects.length - 1)];
  const digits = String(projects.length).length;

  const jumpTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const index = Math.min(count - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * count)));
    select(index);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (projects.length < 2 || event.pointerType === 'touch' || event.button !== 0) return;
    suppressClick.current = false;
    beginDrag(event.clientX, event.clientY, false);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.touch) return;
    if (!(event.buttons & 1)) {
      endDrag();
      delete event.currentTarget.dataset.dragging;
      return;
    }
    if (!state.moved && Math.abs(state.x - event.clientX) <= DRAG_THRESHOLD) return;
    if (!state.moved) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
    }
    updateDrag(event.currentTarget, event.clientX, event.clientY);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.touch) return;
    const moved = endDrag();
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (moved) {
      // Sürükleme sonundaki click, altındaki karta ya da bağlantıya gitmesin.
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="project-showcase"
      aria-labelledby="projeler-baslik"
      style={{ '--showcase-accent': accentOf(active) } as CSSProperties}
    >
      <h1 id="projeler-baslik" className="project-showcase__title" aria-label="MACS Projeleri">
        <span className="project-showcase__word text-white" aria-hidden="true">{letters('MACS', 0)}</span>
        {' '}
        <span className="project-showcase__word text-macs-accent font-medium" aria-hidden="true">{letters('Projeleri', 4)}</span>
      </h1>
      <div
        ref={stageRef}
        className="project-showcase__stage"
        role="region"
        aria-roledescription="proje vitrini"
        aria-label="Projelere göz at"
        tabIndex={0}
        onKeyDown={(event) => {
          if (projects.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }}
        onTouchStart={(event) => {
          if (projects.length < 2) return;
          beginDrag(event.touches[0].clientX, event.touches[0].clientY, true);
        }}
        onTouchMove={(event) => {
          if (projects.length < 2) return;
          updateDrag(event.currentTarget, event.touches[0].clientX, event.touches[0].clientY);
        }}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {projects.map((project, index) => {
          const distance = projects.length === 1 ? 0 : wrapOffset(index, center, count);
          return (
            <ShowcaseCard
              key={project.id}
              project={project}
              index={index}
              count={count}
              driver={driver}
              current={index === active}
              inView={Math.abs(distance) <= 3}
              reachable={Math.abs(distance) <= 2}
              accent={accentOf(index)}
              reduced={reduced}
              onSelect={select}
            />
          );
        })}
      </div>
      {projects.length > 1 && (
        <div className="project-showcase__nav" aria-hidden="true">
          <span className="project-showcase__count">
            <RollingNumber value={active + 1} length={digits} />
            <span className="project-showcase__count-total">/ {String(projects.length).padStart(digits, '0')}</span>
          </span>
          <div className="project-showcase__progress" onPointerDown={jumpTo}>
            <span ref={thumbRef} className="project-showcase__thumb" style={{ '--span': 1 / count } as CSSProperties} />
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{`${active + 1} / ${count}: ${currentProject.title}`}</p>
    </section>
  );
}
