import '../../../styles/components/team.css'

import React, { useEffect, useState } from "react";
import { X } from 'lucide-react';
import { getInitialsAvatar } from '../../../shared/utils/media';

const board_data = [
  {
    member: "Doğu Alagöz",
    role: "Yönetim Kurulu Başkanı",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    pic: "/assets/images/profiles/dogupp.webp"
  },
  {
    member: "Leyla Mammadova",
    role: "Yönetim Kurulu Başkan Yardımcısı",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio: "Frontend geliştirme odaklı",
    pic: "/assets/images/profiles/leylapp.webp"
  },
  {
    member: "Yusuf Efe Taşdelen",
    role: "Proje Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/yusufefepp.webp"
  }
];

const coordinator_data = [
  {
    member: "Ceren Çetin",
    role: "Sponsorluk Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/ceren.webp"
  },
  {
    member: "Deniz Naz Coşkun",
    role: "Genel Sekreter",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/deniz.webp"
  },
  {
    member: "Nehir Coşan",
    role: "Kurumsal İletişim Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/nehir.webp"
  },
  {
    member: "Emir Tepedeldiren",
    role: "İnsan Kaynakları",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/emir.webp"
  },
  {
    member: "Yusuf Oyan",
    role: "İnsan Kaynakları",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/yusufoyan.webp"
  },
  {
    member: "Semanur Toy",
    role: "Sosyal Medya Koordinatörü",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/sema.webp"
  }
];

const TeamSection = () => {
  const [selectedMember, setSelectedMember] = useState(null);

  const openModal = (person) => {
    setSelectedMember(person);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedMember(null);
    document.body.style.overflow = 'auto';
  };

  useEffect(() => {
    if (!selectedMember) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMember]);

  const renderSocialLinks = (person) => {
    const links = person.links || {};
    const entries = [
      ['linkedin', links.linkedin, 'LinkedIn'],
      ['github', links.github, 'GitHub'],
      ['instagram', links.instagram, 'Instagram'],
      ['email', links.email && `mailto:${links.email}`, 'E-posta'],
    ].filter(([, href]) => Boolean(href));

    if (entries.length === 0) return null;

    return (
      <div className="member-social">
        {entries.map(([key, href, label]) => (
          <a key={key} href={href} className="social-link" aria-label={label}
            target={key === 'email' ? undefined : '_blank'} rel="noreferrer">
            <img src={`/assets/images/img_${key === 'email' ? 'email' : key}.png`} alt="" />
          </a>
        ))}
      </div>
    );
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

          <h3 className="team-group-title">Yönetim Kurulu</h3>
          <div className="team-board">
            {board_data.map((p, index) => (
              <button
                type="button"
                className="team-board-card"
                key={index}
                onClick={() => openModal(p)}
                aria-haspopup="dialog"
              >
                <div
                  className="member-avatar member-avatar--lg"
                  style={{ backgroundImage: `url(${p.pic || getInitialsAvatar(p.member)})` }}
                ></div>
                <h3 className="member-name">{p.member}</h3>
                <span className="member-role-pill">{p.role}</span>
                <p className="member-department">{p.graduate}</p>
                {p.bio && <p className="member-bio">{p.bio}</p>}
              </button>
            ))}
          </div>

          <h3 className="team-group-title">Koordinatörler</h3>
          <div className="team-coord-grid">
            {coordinator_data.map((p, index) => (
              <button
                type="button"
                className="team-coord-card"
                key={index}
                onClick={() => openModal(p)}
                aria-haspopup="dialog"
              >
                <div
                  className="member-avatar member-avatar--sm"
                  style={{ backgroundImage: `url(${p.pic || getInitialsAvatar(p.member)})` }}
                ></div>
                <div className="team-coord-card__text">
                  <h3 className="member-name">{p.member}</h3>
                  <p className="member-role">{p.role}</p>
                  <p className="member-department">{p.graduate}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="team-modal-overlay" onClick={closeModal}>
          <div className="team-modal" role="dialog" aria-modal="true"
            aria-label={`${selectedMember.member} profili`}
            onClick={(e) => e.stopPropagation()}>
            <button className="team-modal-close" onClick={closeModal} aria-label="Profili kapat">
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
              {selectedMember.bio && <p className="team-modal-bio">{selectedMember.bio}</p>}
              {renderSocialLinks(selectedMember)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TeamSection;
