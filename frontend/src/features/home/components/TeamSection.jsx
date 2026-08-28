import '../../../styles/components/team.css'

import React, { memo, useState } from "react";
import { X } from 'lucide-react';
import { getInitialsAvatar } from '../../../shared/utils/media';

const people_data = {
  DoguAlagoz: {
    member: "Doğu Alagöz",
    role: "Yönetim Kurulu Başkanı",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    pic: "/assets/images/profiles/dogupp.jpeg"
  },

  YusufEfeTasdelen: {
    member: "Yusuf Efe Taşdelen",
    role: "Proje Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/yusufefepp.jpeg"
  },
  CerenCetin: {
    member: "Ceren Çetin",
    role: "Sponsorluk Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/ceren.jpeg"
  },
  LeylaMammadova: {
    member: "Leyla Mammadova",
    role: "Yönetim Kurulu Başkan Yardımcısı",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio: "Frontend geliştirme odaklı",
    pic: "/assets/images/profiles/leylapp.jpg"
  },
  DenizNazCoskun: {
    member: "Deniz Naz Coşkun",
    role: "Genel Sekreter",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/deniz.jpeg"
  },
  EmirTepedeldiren: {
    member: "Emir Tepedeldiren",
    role: "İnsan Kaynakları",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/emir.jpeg"
  },
  YusufOyan: {
    member: "Yusuf Oyan",
    role: "İnsan Kaynakları",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/yusufoyan.jpeg"
  },
  NehirCosan: {
    member: "Nehir Coşan",
    role: "Kurumsal İletişim Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/nehir.jpeg"
  },
  SemanurToy: {
    member: "Semanur Toy",
    role: "Sosyal Medya Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/sema.jpeg"
}
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
                  style={{ backgroundImage: `url(${p.pic || getInitialsAvatar(p.member)})` }}
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
                style={{ backgroundImage: `url(${selectedMember.pic || getInitialsAvatar(selectedMember.member)})` }}
              ></div>
            </div>
            <div className="team-modal-body">
              <h2 className="team-modal-name">{selectedMember.member}</h2>
              <span className="team-modal-role">{selectedMember.role}</span>
              <p className="team-modal-graduate">{selectedMember.graduate}</p>
              <p className="team-modal-bio">{selectedMember.bio}</p>
              <div className="team-modal-social">
                <a href="#!" className="social-link" aria-label="LinkedIn">
                  <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
                </a>
                <a href="#!" className="social-link" aria-label="GitHub">
                  <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
                </a>
                <a href="#!" className="social-link" aria-label="Instagram">
                  <img src="/assets/images/img_instagram_circle.png" alt="Instagram" />
                </a>
                <a href="#!" className="social-link" aria-label="Email">
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
