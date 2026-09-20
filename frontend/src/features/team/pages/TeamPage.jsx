import React from 'react';
import SEO from '../../../shared/components/seo/SEO';
import TeamSection from '../components/TeamSection';
import '../../../styles/pages/team.css';

/**
 * Ekibimiz sayfasi.
 *
 * Icerigi TeamSection tasiyor; sayfa yalnizca meta veriyi ve sayfa seviyesinde
 * h1'i sagliyor. Ayni bolum Hakkimizda sayfasinda da h2 olarak render ediliyor.
 */
export default function TeamPage() {
  return (
    <>
      <SEO
        title="Ekibimiz"
        description="MACS yönetim kurulu ve koordinatörleri: Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü'nden dokuz öğrenci."
        keywords="MACS ekip, yönetim kurulu, koordinatörler, ESOGÜ, Matematik ve Bilgisayar Bilimleri"
        url="https://esogumacs.com/ekibimiz"
      />
      <div className="page-content fade-in team-page">
        <TeamSection as="h1" />
      </div>
    </>
  );
}
