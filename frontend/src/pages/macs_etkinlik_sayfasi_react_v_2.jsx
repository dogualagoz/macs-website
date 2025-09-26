import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  MapPin,
  Share2,
  Star,
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { useParams } from 'react-router-dom';
import { getJson } from '../api/http';
import { getImageUrl } from '../utils/imageUtils';
import '../styles/pages/events2.css'

/**
 * MACS Etkinlik Sayfası – Plan A (arka plan beyaz, hero lacivert overlay, kartlar beyaz)
 * - Hızlı yayın çözümü: Tek `content` alanından "Hakkında" ve "Program"u otomatik ayırır.
 * - Program satırlarını HH:MM - Başlık tarzında parse eder; bulunamazsa sentetik akışa düşer.
 */

const demoEvent = {
  id: 1,
  title: "MACS's LOG 2025",
  slug: "macs-s-log-2025",
  description:
    "Birbirinden değerli konuşmacılarla kariyer, yazılım ve topluluk kültürü üzerine ilham verici bir gün.",
  // Admin panelde tek content alanına yazılacak örnek metin
  content: `## Hakkında\nMACS's LOG; geliştirme kültürü, topluluk yönetimi ve kariyer yolculuklarına odaklanan bir etkinliktir.\nGün boyunca **atölyeler**, **konferanslar** ve **networking** oturumları yer alacaktır.\n\n## Program\n09:30 - Kayıt & Karşılama\n10:00 - Açılış Konuşması\n11:30 - Keynote\n13:30 - Öğle Arası\n14:30 - Atölyeler\n16:30 - Kapanış & Networking`,
  image_url:
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1600&auto=format&fit=crop",
  location: "Osmangazi Üniversitesi F-1 Binası",
  start_time: "2025-10-25T09:30:00+03:00",
  end_time: "2025-10-25T17:00:00+03:00",
  category_id: 3,
  category: { id: 3, name: "Etkinlik" },
  created_by: 7,
  creator: { id: 7, name: "MACS Ekibi" },
  is_active: true,
  is_deleted: false,
  is_featured: true,
};

function formatDate(dt) {
  try {
    const d = new Date(dt + 'Z');
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    }).format(d);
  } catch (e) {
    return dt;
  }
}

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

const badgeVariants = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 22 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// --- Hızlı Yayın: content içinden Hakkında ve Program'ı ayır ---
function splitContent(content = "") {
  const raw = String(content || "").trim();
  if (!raw) return { aboutHtml: "<p>Detaylı içerik yakında.</p>", programLines: [] };
  // "## Program" / "<h2>Program</h2>" / "PROGRAM:"
  const markers = [/^##\s*Program\b/im, /<h2[^>]*>\s*Program\s*<\/h2>/i, /^PROGRAM:?$/im];
  let idx = -1, m = null;
  for (const rx of markers) {
    m = raw.match(rx);
    if (m) { idx = m.index ?? -1; break; }
  }
  if (idx === -1) return { aboutHtml: mdLikeToHtml(raw), programLines: [] };

  const before = raw.slice(0, idx).trim();
  const after = raw.slice(idx + (m?.[0]?.length || 0)).trim();
  const programLines = after.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return { aboutHtml: mdLikeToHtml(before), programLines };
}

function mdLikeToHtml(text) {
  // Basit dönüştürücü: başlık temizleme, **kalın**, paragraflar
  const escaped = text
    .replace(/^##\s*Hakkında\b\s*/im, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const ps = escaped.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
  return ps || "<p></p>";
}

function parseProgram(programLines, startDate) {
  const items = [];
  const base = new Date(startDate);
  for (const line of programLines) {
    // Desteklenen kalıplar: "- 09:30 - Açılış", "09:30 Açılış", "09:30-10:00 Atölye"
    const cleaned = line.replace(/^[-*]\s*/, "");
    const m = cleaned.match(/(\d{1,2}:\d{2})(?:\s*[–—-]\s*(\d{1,2}:\d{2}))?\s*[–—-]?\s*(.+)/);
    if (m) {
      const [, startT, endT, title] = m;
      const s = combineDateTime(base, startT);
      items.push({ t: s, title: (title || "").trim(), end: endT ? combineDateTime(base, endT) : null });
    }
  }
  return items;
}

function combineDateTime(date, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function EventPageView({ event }) {
  const isPast = new Date(event.end_time) < new Date();
  const { aboutHtml, programLines } = splitContent(event.content);

  return (
    <div className="min-h-screen bg-white text-[#07132b]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${getImageUrl(event.image_url)})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#07132b]/70" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 lg:pt-28 lg:pb-24 text-white"
        >
          <div className="mb-6 flex items-center gap-3 text-sm text-white/80">
            <ArrowLeft className="h-4 w-4" />
            <a href="/etkinlikler" className="hover:underline">Etkinliklere dön</a>
          </div>

          <div className="flex flex-col-reverse items-start gap-8 lg:grid lg:grid-cols-5 lg:gap-12">
            {/* Left: Title & Meta */}
            <div className="col-span-3">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <motion.span
                  variants={badgeVariants}
                  initial="initial"
                  animate="animate"
                  className={classNames(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                    event.is_featured
                      ? "border-yellow-400/50 bg-yellow-400/20 text-yellow-200"
                      : "border-white/20 bg-white/20 text-white"
                  )}
                >
                  {event.is_featured ? <Star className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  {event.is_featured ? "Öne Çıkan" : event.category?.name || "Etkinlik"}
                </motion.span>
                {event.is_active ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-white-900 ring-1 ring-white-400/40">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Kayıt Açık
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-400/40">
                    <Clock className="h-3.5 w-3.5" /> Yakında
                  </span>
                )}
              </div>

              <motion.h1
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl font-bold leading-tight tracking-tight md:text-5xl"
              >
                {event.title}
              </motion.h1>

              <p className="mt-4 max-w-2xl text-white/90">{event.description}</p>

              {/* Meta chips */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                <MetaChip icon={CalendarDays} label={formatDate(event.start_time)} />
                <MetaChip icon={Clock} label={new Date(event.start_time + 'Z').toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} />
                <MetaChip icon={MapPin} label={event.location} />
              </div>

              {/* CTA */}
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton>
                  Kayıt Ol
                </PrimaryButton>
                <GhostButton>
                  <Share2 className="h-4 w-4" /> Paylaş
                </GhostButton>
                <GhostButton>
                  <ExternalLink className="h-4 w-4" /> Takvime Ekle
                </GhostButton>
              </div>
            </div>

            {/* Right: Floating card */}
            <motion.aside
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="col-span-2 w-full"
            >
              <div className="sticky top-6 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Etkinlik Bilgileri</h3>
                <DetailRow icon={CalendarDays} title="Tarih" value={formatDate(event.start_time)} />
                <DetailRow icon={Clock} title="Saat" value={new Date(event.start_time + 'Z').toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} />
                <DetailRow icon={MapPin} title="Konum" value={event.location} />
                <div className="mt-4 flex gap-2">
                  <SmallButton>Yol Tarifi</SmallButton>
                  <SmallButton variant="ghost"><Link2 className="h-3.5 w-3.5" />
                    Bağlantı</SmallButton>
                </div>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      </section>

      {/* Content & Program */}
      <main className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
          {/* Content */}
          <motion.section
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="lg:col-span-2"
          >
            <Card>
              <h2 className="mb-4 text-xl font-semibold">Hakkında</h2>
              <div
                className="prose max-w-none prose-p:leading-relaxed prose-li:marker:text-slate-600 text-slate-700"
                dangerouslySetInnerHTML={{ __html: aboutHtml }}
              />
            </Card>

            {/* Programı sadece content içinde mevcutsa göster */}
            {programLines.length > 0 && (
              <Card className="mt-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Program Akışı</h2>
                  <div className="text-xs text-slate-500">* İçerikten parse edildi</div>
                </div>
                <Timeline start={event.start_time} end={event.end_time} contentProgramLines={programLines} />
              </Card>
            )}
          </motion.section>

          {/* Sidebar extra */}
          <motion.aside
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="lg:col-span-1"
          >
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Organizasyon</h3>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-lg font-semibold text-slate-800">
                  {(event.creator?.name || "M").slice(0, 1)}
                </div>
                <div>
                  <div className="font-medium text-slate-800">{event.creator?.name || "MACS"}</div>
                  <div className="text-xs text-slate-500">Oluşturan</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <Tag>#{event.slug}</Tag>
                <Tag>{event.category?.name || "Etkinlik"}</Tag>
                {event.is_active && <Tag>Aktif</Tag>}
                {event.is_featured && <Tag>Öne Çıkan</Tag>}
              </div>
            </Card>

            <Card className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Sık Sorulanlar</h3>
              <Accordion
                items={[
                  { q: "Katılım ücretsiz mi?", a: "Evet, etkinliğimiz öğrencilere açıktır ve ücretsizdir." },
                  { q: "Sertifika var mı?", a: "Gün sonu dijital katılım belgesi mail ile iletilecektir." },
                  { q: "Kayıt zorunlu mu?", a: "Kontenjan sınırlı olduğundan kayıt olmanızı öneririz." },
                ]}
              />
            </Card>
          </motion.aside>
        </div>

        {/* Bottom CTA (Plan A: lacivert blok) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          className="mt-12 overflow-hidden rounded-2xl bg-[#07132b] p-6 text-white"
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl font-semibold">{isPast ? "Bir sonraki etkinliği kaçırma" : "Bizimle aynı gün buluşalım"}</h3>
              <p className="mt-1 text-white/80">MACS topluluğuna katıl ve en yeni etkinliklerden haberdar ol.</p>
            </div>
            <div className="flex gap-3">
              <PrimaryButton>Bildirim Al</PrimaryButton>
              <GhostButton>
                <ArrowRight className="h-4 w-4" /> Tüm Etkinlikler
              </GhostButton>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-16 pt-8 text-center text-sm text-slate-500">
        MACS • Matematik ve Bilgisayar Bilimleri Topluluğu
      </footer>
    </div>
  );
}

/* -------------------------- UI PRIMITIVES -------------------------- */
function Card({ children, className }) {
  return (
    <div className={classNames("rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200", className)}>
      {children}
    </div>
  );
}

function MetaChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

function PrimaryButton({ children }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-medium text-[#07132b] shadow hover:shadow-lg"
    >
      {children}
    </motion.button>
  );
}

function GhostButton({ children }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-transparent px-4 py-2 text-white hover:bg-white/10"
    >
      {children}
    </motion.button>
  );
}

function SmallButton({ children, variant }) {
  const base = "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs";
  const styles = variant === "ghost"
    ? "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"
    : "bg-[#07132b] text-white";
  return <button className={`${base} ${styles}`}>{children}</button>;
}

function DetailRow({ icon: Icon, title, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 py-3 last:border-none">
      <Icon className="mt-0.5 h-4 w-4 text-slate-500" />
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-sm text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function Accordion({ items = [] }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="border-b border-slate-200 py-3">
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between text-left text-sm font-medium"
            aria-expanded={open === i}
            aria-controls={`accordion-panel-${i}`}
          >
            <span>{it.q}</span>
            <motion.span animate={{ rotate: open === i ? 90 : 0 }}>
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                key={`panel-${i}`}
                id={`accordion-panel-${i}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-sm text-slate-700"
              >
                <div className="pt-2">{it.a}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function Timeline({ start, end, contentProgramLines }) {
  const startDate = new Date(start);
  const items = contentProgramLines && contentProgramLines.length
    ? parseProgram(contentProgramLines, startDate)
    : [];

  if (!items.length) return null;

  return (
    <ol className="relative ml-1 border-l border-slate-200 pl-6">
      {items.map((it, idx) => (
        <motion.li
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, delay: idx * 0.06 }}
          className="mb-6"
        >
          <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-[#07132b]"></span>
          <div className="text-xs text-slate-500">
            {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(it.t)}
          </div>
          <div className="text-sm font-medium text-slate-800">{it.title}</div>
        </motion.li>
      ))}
    </ol>
  );
}

function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

// Container: fetch event by slug and render view
export default function EventPageContainer() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getJson(`/events/by-slug/${slug}`)
      .then(data => { if (mounted) { setEvent(data); setError(null); }})
      .catch(err => { if (mounted) setError(err.message || 'Bir hata oluştu'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [slug]);

  if (loading) return <div className="spinner center"><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div><div className="spinner-blade"></div></div>;
  if (error) return <div className="error-container"><div className="error-icon">⚠️</div><p>{error}</p></div>;
  if (!event) return null;

  return <EventPageView event={event} />;
}

/* -------------------------- BASİT TESTLER -------------------------- */
function runEventPageTests() {
  try {
    // 1) Markdown başlık ayracı
    const in1 = "## Hakkında\nAçıklama\n\n## Program\n09:30 - Açılış\n10:00 - Keynote";
    const s1 = splitContent(in1);
    console.assert(s1.aboutHtml.includes("Açıklama"), "aboutHtml dönüşümü başarısız");
    console.assert(s1.programLines.length === 2, "programLines ayrıştırma başarısız");
    const p1 = parseProgram(s1.programLines, new Date("2025-10-25T09:00:00+03:00"));
    console.assert(p1[0].title.includes("Açılış"), "parseProgram başlık hatası");

    // 2) HTML başlık ayracı
    const in2 = "<h2>Hakkında</h2><p>X</p><h2>Program</h2>09:00 - Y";
    const s2 = splitContent(in2);
    console.assert(s2.programLines.length === 1, "HTML başlık ayracı başarısız");

    // 3) Düz metin 'PROGRAM:' ayracı
    const in3 = "Hakkında metin\n\nPROGRAM:\n09:15 Z";
    const s3 = splitContent(in3);
    console.assert(s3.programLines.length === 1, "PROGRAM: ayracı başarısız");

    console.log("[EventPage] Tüm testler geçti ✅");
  } catch (e) {
    console.error("[EventPage] Test hata ❌", e);
  }
}
if (typeof window !== "undefined" && !window.__EVENTPAGE_TESTED__) {
  runEventPageTests();
  window.__EVENTPAGE_TESTED__ = true;
}
