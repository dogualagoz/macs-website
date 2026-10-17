/**
 * Footer'ın üstündeki kod mezarlığı: emekliye ayrılmış teknolojiler için
 * mezar taşları. Tamamen dekoratif; içerik ekran okuyucuya okunmuyor.
 */
import React from 'react';
import { Pumpkin, Cobweb } from './HalloweenArt';

// shape: taşın silueti. tilt: derece cinsinden yamukluk.
// Dar ekranlarda listenin sonundakiler gizleniyor (bkz. .hw-stone:nth-child).
const STONES = [
  { name: 'Internet Explorer', years: '1995 – 2022', epitaph: 'Sonunda yüklendi.', shape: 'round', tilt: -3 },
  { name: 'jQuery', years: '2006 – ?', epitaph: 'Henüz ölmedi.', shape: 'arch', tilt: 2 },
  { name: 'undefined', years: '', epitaph: 'Hiç tanımlanmadı.', shape: 'slab', tilt: -1 },
  { name: 'Flash Player', years: '1996 – 2020', epitaph: 'Eklenti gerekiyordu.', shape: 'arch', tilt: 3 },
  { name: 'Python 2', years: '2000 – 2020', epitaph: 'print parantezsizdi.', shape: 'round', tilt: -2 },
  { name: 'Kaydedilmemiş dosya', years: '', epitaph: 'Ctrl+S basılmadı.', shape: 'slab', tilt: 1.5 },
];

export default function Graveyard() {
  return (
    <div className="hw-graveyard" aria-hidden="true">
      <Cobweb className="hw-web hw-web--graveyard" />
      <div className="hw-graveyard__row">
        {STONES.map((stone, i) => (
          <React.Fragment key={stone.name}>
            {i === 3 && <Pumpkin className="hw-graveyard__pumpkin" lit />}
            <div
              className={`hw-stone hw-stone--${stone.shape}`}
              style={{ '--tilt': `${stone.tilt}deg` }}
            >
              <span className="hw-stone__rip">RIP</span>
              <span className="hw-stone__name">{stone.name}</span>
              {stone.years && <span className="hw-stone__years">{stone.years}</span>}
              <span className="hw-stone__epitaph">{stone.epitaph}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="hw-graveyard__ground" />
      <div className="hw-fog hw-fog--graveyard" />
    </div>
  );
}
