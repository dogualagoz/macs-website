/**
 * Konami kodunun ödülü: ekranın altından yukarı doğru dağılan yarasa sürüsü.
 * Son yarasa çıkınca onDone çağrılıyor ve bileşen kaldırılıyor.
 */
import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Bat } from './HalloweenArt';

const BAT_COUNT = 22;
const MAX_DELAY_S = 0.9;
const MAX_DURATION_S = 3.2;

const between = (min, max) => min + Math.random() * (max - min);

export default function BatSwarm({ onDone }) {
  const bats = useMemo(
    () =>
      Array.from({ length: BAT_COUNT }, (_, i) => {
        const x0 = between(20, 80);
        return {
          id: i,
          x0: `${x0}vw`,
          // Merkezden uzaklaştıkça yana daha çok açılıyor.
          x1: `${x0 + (x0 - 50) * between(0.8, 1.6) + between(-15, 15)}vw`,
          dur: `${between(2, MAX_DURATION_S).toFixed(2)}s`,
          delay: `${between(0, MAX_DELAY_S).toFixed(2)}s`,
          scale: between(0.5, 1.3).toFixed(2),
        };
      }),
    []
  );

  useEffect(() => {
    const timer = setTimeout(onDone, (MAX_DELAY_S + MAX_DURATION_S) * 1000 + 200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="hw-swarm" aria-hidden="true">
      {bats.map((bat) => (
        <div
          key={bat.id}
          className="hw-swarm__bat"
          style={{
            '--x0': bat.x0,
            '--x1': bat.x1,
            '--dur': bat.dur,
            '--delay': bat.delay,
            '--s': bat.scale,
          }}
        >
          <Bat className="hw-bat-svg" />
        </div>
      ))}
    </div>
  );
}

BatSwarm.propTypes = {
  onDone: PropTypes.func.isRequired,
};
