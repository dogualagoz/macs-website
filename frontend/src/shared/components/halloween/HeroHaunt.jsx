/**
 * Hero'nun Halloween katmanı: dolunay, alttan kayan sis, ayın önünden geçen
 * yarasalar ve üst köşelerde örümcek ağı. Overlay'in üstünde, içeriğin
 * altında duruyor; tıklamaları engellemiyor.
 */
import React from 'react';
import { Bat, Cobweb } from './HalloweenArt';

// Her yarasa kendi rotasında, farklı hız ve gecikmeyle uçuyor.
// rx/ry: reduced-motion açıkken yarasanın sabit durduğu konum.
const HERO_BATS = [
  { id: 'a', y0: '22vh', y1: '8vh', dur: '17s', delay: '0s', scale: 1, rx: '72vw', ry: '16vh' },
  { id: 'b', y0: '30vh', y1: '18vh', dur: '21s', delay: '6s', scale: 0.7, rx: '80vw', ry: '24vh' },
  { id: 'c', y0: '14vh', y1: '26vh', dur: '24s', delay: '11s', scale: 0.55, rx: '64vw', ry: '10vh' },
  { id: 'd', y0: '40vh', y1: '20vh', dur: '19s', delay: '15s', scale: 0.8, rx: '18vw', ry: '30vh' },
];

export default function HeroHaunt() {
  return (
    <div className="hw-haunt" aria-hidden="true">
      <div className="hw-moon" />

      {HERO_BATS.map((bat) => (
        <div
          key={bat.id}
          className="hw-hero-bat"
          style={{
            '--y0': bat.y0,
            '--y1': bat.y1,
            '--dur': bat.dur,
            '--delay': bat.delay,
            '--s': bat.scale,
            '--rx': bat.rx,
            '--ry': bat.ry,
          }}
        >
          <Bat className="hw-bat-svg" />
        </div>
      ))}

      <Cobweb className="hw-web hw-web--left" />
      <Cobweb className="hw-web hw-web--right" />
      <div className="hw-spider">
        <span className="hw-spider__thread" />
        <span className="hw-spider__body" />
      </div>

      <div className="hw-fog hw-fog--back" />
      <div className="hw-fog hw-fog--front" />
    </div>
  );
}
