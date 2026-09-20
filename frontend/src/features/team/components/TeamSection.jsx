import '../../../styles/components/team.css'

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getInitialsAvatar } from '../../../shared/utils/media';

/* pic  : 3:4 portre masterlari (900x1200; ceren 482x642) — kaynak dosyalardan
          scripts/portraits.py ile uretilir: yuze gore kadraj + set icinde renk esitleme
   slug : team.css'teki kisi basi ton ayarinin anahtari (data-p)
   year : izgarada kisa hali. Bolum adi lede'de bir kez soyleniyor,
          dokuz kez tekrar etmesi gurultuydu; tam hali modalda kaliyor. */
const board_data = [
  {
    slug: "dogu",
    member: "Doğu Alagöz",
    role: "Yönetim Kurulu Başkanı",
    year: "4. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    pic: "/assets/images/profiles/dogupp-portrait.webp"
  },
  {
    slug: "leyla",
    member: "Leyla Mammadova",
    role: "Yönetim Kurulu Başkan Yardımcısı",
    year: "4. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    pic: "/assets/images/profiles/leylapp-portrait.webp"
  },
  {
    slug: "yusufefe",
    member: "Yusuf Efe Taşdelen",
    role: "Proje Koordinatörü",
    year: "3. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/yusufefepp-portrait.webp"
  }
];

const coordinator_data = [
  {
    slug: "ceren",
    member: "Ceren Çetin",
    role: "Sponsorluk Koordinatörü",
    year: "2. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/ceren-portrait.webp"
  },
  {
    slug: "deniz",
    member: "Deniz Naz Coşkun",
    role: "Genel Sekreter",
    year: "2. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/deniz-portrait.webp"
  },
  {
    slug: "nehir",
    member: "Nehir Coşan",
    role: "Kurumsal İletişim Koordinatörü",
    year: "3. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    pic: "/assets/images/profiles/nehir-portrait.webp"
  },
  {
    slug: "emir",
    member: "Emir Tepedeldiren",
    role: "İnsan Kaynakları Koordinatörü",
    year: "2. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/emir-portrait.webp"
  },
  {
    slug: "yusufoyan",
    member: "Yusuf Oyan",
    role: "İnsan Kaynakları Koordinatörü",
    year: "2. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/yusufoyan-portrait.webp"
  },
  {
    slug: "sema",
    member: "Semanur Toy",
    role: "Sosyal Medya Koordinatörü",
    year: "2. sınıf",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    pic: "/assets/images/profiles/sema-portrait.webp"
  }
];

/* Tek levha. tier="kurul" ise kunye fotografin icinde, "koordinator" ise
   sayfanin uzerinde. Boyut iki kademede de aynidir. */
const Plate = ({ person, tier, index, reduce, onOpen }) => {
  const inside = tier === 'kurul';

  const caption = (
    <>
      <span className="team-person__name">{person.member}</span>
      <span className="team-person__role">{person.role}</span>
      <span className="team-person__year">{person.year}</span>
    </>
  );

  return (
    <button
      type="button"
      className="team-person"
      data-p={person.slug}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(person, event.currentTarget)}
    >
      <motion.span
        className="team-plate"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, delay: (index % 3) * 0.06, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <img
          className="team-plate__img"
          src={person.pic}
          alt=""
          width="900"
          height="1200"
          loading="lazy"
          decoding="async"
          onError={(event) => { event.currentTarget.src = getInitialsAvatar(person.member); }}
        />
        <span className="team-plate__ink" aria-hidden="true" />
        <span className="team-plate__grain" aria-hidden="true" />
        {inside && <span className="team-plate__id">{caption}</span>}
      </motion.span>
      {!inside && <span className="team-person__cap">{caption}</span>}
    </button>
  );
};

/* as: baslik etiketi. Bolum olarak (Hakkimizda icinde) h2, kendi sayfasinda
   h1 — bir sayfada iki h1 olmasin diye. */
const TeamSection = ({ as: Heading = 'h2' }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const openerRef = useRef(null);
  const closeRef = useRef(null);
  const reduce = useReducedMotion();

  const openModal = useCallback((person, trigger) => {
    openerRef.current = trigger || null;
    setSelectedMember(person);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setSelectedMember(null);
    document.body.style.overflow = 'auto';
    if (openerRef.current) {
      openerRef.current.focus();
      openerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!selectedMember) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    if (closeRef.current) closeRef.current.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedMember, closeModal]);

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
      <section className="team-section" id="ekip" style={{ cursor: "default" }}>
        <div className="container">
          <Heading className="section-title">Yönetim Ekibimizle Tanışın</Heading>
          <p className="team-lede">
            MACS’i dokuz öğrenci yürütüyor; hepsi ESOGÜ Matematik ve Bilgisayar
            Bilimleri bölümünden. Tanımak istediğiniz kişinin fotoğrafına tıklayın.
          </p>

          <h3 className="team-rank">Yönetim Kurulu</h3>
          <div className="team-plates team-plates--kurul">
            {board_data.map((person, index) => (
              <Plate
                key={person.slug}
                person={person}
                tier="kurul"
                index={index}
                reduce={reduce}
                onOpen={openModal}
              />
            ))}
          </div>

          <h3 className="team-rank">Koordinatörler</h3>
          <div className="team-plates team-plates--koordinator">
            {coordinator_data.map((person, index) => (
              <Plate
                key={person.slug}
                person={person}
                tier="koordinator"
                index={index}
                reduce={reduce}
                onOpen={openModal}
              />
            ))}
          </div>

          <div className="team-join">
            <div className="team-join__text">
              <p className="team-join__title">Sıradaki sen ol</p>
              <p className="team-join__note">
                Bu ekip her dönem yenileniyor. Bir etkinliğimize gel, tanışalım.
              </p>
            </div>
            <Link className="team-join__btn" to="/etkinlikler">Etkinliklere göz at</Link>
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="team-modal-overlay" onClick={closeModal}>
          <div className="team-modal" role="dialog" aria-modal="true"
            aria-label={`${selectedMember.member} profili`}
            onClick={(e) => e.stopPropagation()}>
            <button ref={closeRef} className="team-modal-close" onClick={closeModal} aria-label="Profili kapat">
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
