import React, { useState, useEffect } from "react";
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import TeamSection from '../components/TeamSection';
import Dashboard from "../components/DashBoard";
import '../../../styles/pages/home.css';
import LogoLoader from "../../../shared/components/feedback/LogoLoader";
import SEO from "../../../shared/components/seo/SEO";

export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0.5 saniye sonra loading false olacak
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SEO 
        title="MACS - Matematik ve Bilgisayar Bilimleri Topluluğu"
        description="MACS, Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü öğrencilerinin kurduğu, yazılım projeleri ve etkinlikler düzenleyen aktif bir öğrenci topluluğudur."
        keywords="MACS, Matematik, Bilgisayar Bilimleri, ESOGÜ, yazılım, topluluk, öğrenci kulübü"
        url="https://esogumacs.com"
      />
      <LogoLoader isLoading={loading} />

      {!loading && (
        <div className="page-content fade-in">
          <HeroSection />
          <Dashboard></Dashboard>
          {/* <EventsSection />
          <ProjectsSection /> */}
          <AboutSection />
          <TeamSection />
        </div>
      )}
    </>
  );
}