import React from 'react';
import { Link } from 'react-router-dom';
import { Ghost, Cobweb } from './HalloweenArt';

// Sezon boyunca Page404'ün yerini alıyor; ortadaki 0 bir hayalet.
const HalloweenPage404 = () => {
  return (
    <section className="hw-404">
      <Cobweb className="hw-web hw-web--left" />
      <Cobweb className="hw-web hw-web--right" />

      <p className="hw-404__code">
        <span className="hw-sr-only">404</span>
        <span aria-hidden="true">4</span>
        <span className="hw-404__ghost" aria-hidden="true">
          <Ghost className="hw-404__ghost-svg" />
          <span className="hw-404__ghost-shadow" />
        </span>
        <span aria-hidden="true">4</span>
      </p>

      <h1 className="hw-404__title">Bu sayfa hayalete dönüştü</h1>
      <p className="hw-404__text">
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Adresi kontrol et
        veya ana sayfadan devam et.
      </p>
      <Link to="/" className="hw-404__btn">
        Ana sayfaya dön
      </Link>
    </section>
  );
};

export default HalloweenPage404;
