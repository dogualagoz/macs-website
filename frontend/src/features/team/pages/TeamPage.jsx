import React from 'react';
import SEO from '../../../shared/components/seo/SEO';
import PageHero from '../../../shared/components/ui/PageHero';
import TeamSection, { TEAM_TITLE, TEAM_LEDE } from '../components/TeamSection';

/**
 * Ekibimiz sayfasi.
 *
 * Ust bant ve h1 PageHero'da (Etkinlikler ile ayni); levhalar TeamSection'da.
 * Ayni bolum Hakkimizda sayfasinda kendi h2 basligiyla render ediliyor.
 */
export default function TeamPage() {
  return (
    <>
      <SEO
        title="Ekibimiz"
        description="MACS yönetim kurulu ve koordinatörleri: Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü'nden dokuz öğrenci."
        keywords="MACS ekip, yönetim kurulu, koordinatörler, ESOGÜ, Matematik ve Bilgisayar Bilimleri"
        url="https://macsclub.com.tr/ekibimiz"
      />
      <PageHero title={TEAM_TITLE} description={TEAM_LEDE} />
      <div className="page-content fade-in">
        <TeamSection intro={false} />
      </div>
    </>
  );
}
