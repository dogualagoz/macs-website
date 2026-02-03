import '../../../styles/components/team.css'

import React, { useState } from "react";
import { X } from 'lucide-react';

const people_data = {
  EfeAltun: {
    member: "Efe Altın",
    role: "Kulüp Başkanı",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "AI geliştirme odaklı",
    pic: "/assets/images/profiles/efepp.jpeg"
  },

  DoguAlagoz: {
    member: "Doğu Alagöz",
    role: "Proje Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Backend developer ve Mobil geliştirme odaklı",
    pic: "/assets/images/profiles/dogupp.jpeg"
  },
  ErenAlpaslan: {
    member: "Eren Alpaslan",
    role: "Denetim Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "AI geliştirme odaklı",
    pic: "/assets/images/profiles/erenpp.jpeg"
  },
  LeylaMammadova: {
    member: "Leyla Mammadova",
    role: "Kurumsal İletişim Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio: "Frontend geliştirme odaklı",
    pic: "/assets/images/profiles/leylapp.jpg"
  },
  AzraUskup: {
    member: "Azra Üsküp",
    role: "Genel Sekreter",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Python Geliştirme odaklı",
    pic: "/assets/images/profiles/azrapp.jpeg"
  },
  AliErdemGecgel: {
    member: "Ali Erdem Geçgel",
    role: "Halkla İlişkiler",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio: "Oyun Geliştirme odaklı",
    pic: "/assets/images/profiles/erdempp.jpeg"
  },
};

const TeamSection = () => {
  const people = Object.values(people_data);
  const [selectedMember, setSelectedMember] = useState(null);

  const openModal = (person) => {
    setSelectedMember(person);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedMember(null);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      <section className="team-section" style={{ cursor: "default" }}>
        <div className="container">
          <h2 className="section-title">Yönetim Ekibimizle Tanışın</h2>
          <p className="section-subtitle">
            MACS topluluğunu yöneten deneyimli ve tutkulu, matematik ve bilgisayar
            bilimleri alanında yenilikçi projeler geliştiren yönetim ekibimiz.
          </p>

          <div className="team-grid">
            {people.map((p, index) => (
              <div
                className="team-member"
                key={index}
                onClick={() => openModal(p)}
              >
                <div
                  className="member-avatar"
                  style={{ backgroundImage: `url(${p.pic || '/assets/images/avatar-placeholder.png'})` }}
                ></div>

                <h3 className="member-name">{p.member}</h3>
                <p className="member-role">{p.role}</p>
                <p className="member-department">{p.graduate}</p>
                <p className="member-bio">{p.bio}</p>
                <div className="member-social">
                  <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
                  <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
                  <img src="/assets/images/img_instagram_circle.png" alt="Instagram" />
                  <img src="/assets/images/img_email.png" alt="Email" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="team-modal-overlay" onClick={closeModal}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <button className="team-modal-close" onClick={closeModal}>
              <X size={24} />
            </button>
            <div className="team-modal-header">
              <div
                className="team-modal-avatar"
                style={{ backgroundImage: `url(${selectedMember.pic || '/assets/images/avatar-placeholder.png'})` }}
              ></div>
            </div>
            <div className="team-modal-body">
              <h2 className="team-modal-name">{selectedMember.member}</h2>
              <span className="team-modal-role">{selectedMember.role}</span>
              <p className="team-modal-graduate">{selectedMember.graduate}</p>
              <p className="team-modal-bio">{selectedMember.bio}</p>
              <div className="team-modal-social">
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
                </a>
                <a href="#" className="social-link" aria-label="GitHub">
                  <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
                </a>
                <a href="#" className="social-link" aria-label="Instagram">
                  <img src="/assets/images/img_instagram_circle.png" alt="Instagram" />
                </a>
                <a href="#" className="social-link" aria-label="Email">
                  <img src="/assets/images/img_email.png" alt="Email" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamSection;
