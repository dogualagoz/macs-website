import React, { useState, useEffect , useRef } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  Share2,
  ChevronRight,
  ArrowLeft,
  Users,
  Star,
  CheckCircle2,
  ChevronLeft
} from "lucide-react";
import { useParams } from "react-router-dom";
import { fetchEventBySlug } from "../services/api";
import '../styles/pages/EventDetail.css';

// ---------- Components ----------
function Badge({ children }) {
  return (
    <span className="badge">
      <Star size={14} /> {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="Event-Detail-section">
      <h3 className="sectionTitle">{title}</h3>
      {children}
    </section>
  );
}

// ---------- Main Component ----------
const EventDetail = () => {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const found = await fetchEventBySlug(slug);
        if (!found) setError("Etkinlik bulunamadı");
        setEvent(found || {});
        console.log(found);
      } catch (err) {
        console.error(err);
        setError("Etkinlik yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

if (loading) 
  return (
    <div class="spinner center">
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
      <div class="spinner-blade"></div>
</div>
  );

 if (error) 
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Tekrar Dene</button>
    </div>
  );
  if (!event) return null;

  const StartTime  = (event.start_time || "").split('T')[1].substring(0,5);
  const EndTime    = (event.end_time   || "").split('T')[1];
  const EventDate  = (event.start_time || "").split('T')[0].split('-').reverse().join('/');

  const örnekAçıklama = `Bu etkinlik, dijital pazarlama dünyasına hızlı bir giriş yapmak isteyen herkes için tasarlanmıştır. Katılımcılar, sektörün önde gelen uzmanlarından güncel stratejiler, SEO, sosyal medya reklamcılığı ve içerik pazarlaması konularında bilgi alacak.

Etkinlik boyunca interaktif atölyeler ve canlı örneklerle, teorik bilgileri pratiğe dönüştürme fırsatı bulacaksınız. Ayrıca ağ kurma (networking) etkinlikleri ile benzer ilgi alanlarına sahip kişilerle tanışabilir ve iş birliği fırsatları yakalayabilirsiniz.

Kimler Katılmalı?

-Dijital pazarlama alanında kendini geliştirmek isteyen öğrenciler ve profesyoneller

-Kendi işini büyütmek isteyen girişimciler

Pazarlama stratejilerini güncel tutmak isteyen herkes

Katılımcılar Etkinlikten Şunları Öğrenecek:

Sosyal medya platformlarında etkili reklam stratejileri

SEO ve içerik optimizasyonu

E-posta pazarlaması ve otomasyon

Analitik araçlar ile performans ölçümü`;


  const program = [
  { t: "09:00", title: "Kayıt ve Karşılama" },
  { t: "09:30", title: "Açılış Konuşması" },
  { t: "10:00", title: "Dijital Pazarlama Trendleri" },
  { t: "11:00", title: "SEO ve İçerik Stratejileri" },
  { t: "12:00", title: "Öğle Arası" },
  { t: "13:00", title: "Sosyal Medya Reklamcılığı" },
  { t: "14:00", title: "E-posta Pazarlaması ve Otomasyon" },
  { t: "15:00", title: "Canlı Atölye / Uygulama"},
  { t: "16:00", title: "Soru-Cevap ve Kapanış" }
];
  
const speakers = [
  {
    name: "Ahmet Yılmaz",
    title: "Dijital Pazarlama Uzmanı",
    avatar: "/assets/images/speakers/ahmet.jpg"
  },
  {
    name: "Elif Demir",
    title: "SEO ve İçerik Stratejisti",
    avatar: "/assets/images/speakers/elif.jpg"
  },
  {
    name: "Murat Kaya",
    title: "Sosyal Medya Reklam Danışmanı",
    avatar: "/assets/images/speakers/murat.jpg"
  },
  {
    name: "Ayşe Aksoy",
    title: "E-posta Pazarlama Uzmanı",
    avatar: "/assets/images/speakers/ayse.jpg"
  }
];


  return (
    <div className="event-detail-page">
      <div className="event-detail-container">
    {/* Back */}
        <div onClick={() => window.history.back()} className="event-detail-backBtn">
      <ArrowLeft size={16} /> Geri Dön
    </div>

    {/* Hero */}
    <div className="event-detail-hero">
      <motion.img
        src={event.image_url || "/assets/images/bootcamp.jpg"}
        alt={event.title || "assets"}
        className="event-detail-heroImage"
        initial={{ scale: 1.06, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9 }}
      />
      {/* <div className="event-detail-heroOverlay"></div> */}
      <div className="event-detail-heroText">
        {/* <div className="event-detail-meta">
          <Badge>Etkinlik</Badge>
          <div className="event-detail-metaItem">
            <CalendarDays size={14} /> {event.start_time || "18.00" } - {event.end_time || "20.00"}
          </div>
          <div className="event-detail-metaItem">
            <Clock size={14} /> {event.time || "18/03/2030"}
          </div>
          <div className="event-detail-metaItem">
            <MapPin size={14} /> {event.location || "-"}
          </div>
        </div> */}
        <motion.h1
          className="event-detail-heroTitle"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {event.title || "Etkinlik Başlığı"}
        </motion.h1>
        <p className="event-detail-heroSubtitle">{event.subtitle || ""}</p>
        <div className="event-detail-heroButtons">
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -1 }}
            className="event-detail-buttonPrimary"
          >
            <Ticket size={14} /> Bize Katıl!
          </motion.button>
          <button className="event-detail-buttonSecondary">
            <Share2 size={14} /> Paylaş
          </button>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="event-detail-contentFlex">
      <div className="event-detail-leftColumn">
        <Section title="Etkinlik Açıklaması">
          <p>{event.content || "-"}</p>
          <div className="event-detail-perkList">
            {(event.perks || []).map((p, i) => (
              <div key={i} className="event-detail-perkItem">
                <CheckCircle2 size={16} /> {p}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Program">
          {(event.agenda || program).map((a, i) => (
            <div key={i} className="event-detail-agendaItem">
              <div className="event-detail-agendaLeft">
                <span className="event-detail-time">{a.t || "-"}</span>
                <span>{a.title || "-"}</span>
              </div>
              {/* <ChevronRight size={16} /> */}
            </div>
          ))}
        </Section>

        <Section title="Konuşmacılar">
          <div className="event-detail-speakersList">
             <ChevronLeft size={45} className="event-detail-speakerChevron" />
            {(event.speakers || speakers).map((s, i) => (
              <div key={s.name || i} className="event-detail-speakerCard">
                <img src={s.avatar || "/assets/images/img_shape.png"} alt={s.name || "Konuşmacı"} />
                <div className="event-detail-speakerName">{s.name || "-"}</div>
                <div className="event-detail-speakerTitle">{s.title || "-"}</div>
              </div>
            ))}
            <ChevronRight size={45} />
          </div>
        </Section>
      </div>

      {/* Right Card */}
      <div className="event-detail-rightColumn">
        <Section title="Etkinlik Bilgisi">
          <div className="event-detail-rightCardTop">
            <Users size={16} /> <span>Sınırlı kontenjan</span>
          </div>
          <div className="event-detail-rightCardInfo">
            <div><CalendarDays size={14} /> {EventDate ? EventDate : "-"}</div>
            <div><Clock size={14} /> {StartTime ? StartTime : "-"} - {EndTime ? EndTime : ""}</div>
            <div><MapPin size={14} /> {event.location || "-"}</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="event-detail-buttonPrimary fullWidth"
          >
            Kayıt Ol
          </motion.button>
        </Section>
      </div>
    </div>
  </div>
</div>

  );
};

export default EventDetail;
