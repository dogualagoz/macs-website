import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../../styles/pages/Page404.css';

const Page404 = () => {
  return (
    <div className="notfound">
      {/* defer={false}: başlık render'da yazılsın; GA page_view doğru başlıkla gitsin. */}
      <Helmet defer={false}>
        <title>Sayfa bulunamadı | MACS</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className="notfound__code" aria-hidden="true">404</p>
      <h1 className="notfound__title">Sayfa bulunamadı</h1>
      <p className="notfound__text">
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <Link to="/" className="macs-btn macs-btn--primary">
        Ana sayfaya dön
      </Link>
    </div>
  );
};

export default Page404;
