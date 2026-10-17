/**
 * Halloween temasının anahtarı. <html data-theme="halloween"> özniteliğini
 * public sayfalarda basıyor, admin ve login'de kaldırıyor; tema CSS'inin
 * tamamı bu özniteliğe bağlı. Ayrıca Konami kodunu dinliyor.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import BatSwarm from './BatSwarm';

const UNTHEMED_PREFIXES = ['/admin', '/login'];

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export default function HalloweenLayer() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const themed = !UNTHEMED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  // Her tetiklemede yeni key: sürü uçarken kod tekrar girilirse baştan başlar.
  const [swarmKey, setSwarmKey] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (themed) {
      root.dataset.theme = 'halloween';
    } else {
      delete root.dataset.theme;
    }
  }, [themed]);

  useEffect(() => {
    if (!themed || reduceMotion) return undefined;

    let progress = 0;
    const onKeyDown = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[progress]) {
        progress += 1;
        if (progress === KONAMI.length) {
          progress = 0;
          setSwarmKey((k) => k + 1);
        }
      } else {
        progress = key === KONAMI[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [themed, reduceMotion]);

  const endSwarm = useCallback(() => setSwarmKey(0), []);

  if (!themed || swarmKey === 0) return null;
  return <BatSwarm key={swarmKey} onDone={endSwarm} />;
}
