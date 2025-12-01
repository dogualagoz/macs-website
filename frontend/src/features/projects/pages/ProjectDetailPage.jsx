import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import {
  Github,
  Globe,
  Share2,
  Tag as TagIcon,
  Users,
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  Hourglass,
  XCircle,
  Rocket,
  Code2,
} from "lucide-react";
import { projectService } from "../../../shared/services/api";
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

/**
 * MACS — Proje Detay Sayfası (v4)
 * Düzenlemeler:
 * - Teknolojiler artık açıklama içinden çıkarılmıyor, doğrudan backend'den (project.technologies gibi) bekleniyor.
 * - GitHub ve Canlı butonları sadece HERO kısmında gösteriliyor. StickyInfo içinde tekrar edilmiyor.
 */

const NAVY = "#07132b";

const demoProject = {
  id: 42,
  title: "Efsane Doğu Projesi",
  slug: "efsane-dogu-projesi",
  description: "Doğunun efsane projesi falan filan.",
  content:
    `Bu proje üniversite öğrencilerinin geliştirme kültürünü artırmak için oluşturulmuştur.\n\n**Amaçlar**\n- Kod kalitesi ve ekip çalışmasını artırmak\n- Açık kaynak katkı kültürü\n- Demo günleri ile sunum pratiği`,
  image_url:
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1200&auto=format&fit=crop",
  github_url: "https://github.com/macs/efsane-dogu",
  live_url: "https://macsclub.tr/projeler/efsane-dogu-projesi/demo",
  status: "IN_PROGRESS",
  category: { id: 3, name: "Web" },
  creator: { id: 7, name: "MACS Ekibi" },
  team_members: ["Doğu", "Kerem", "Yiğit"],
  created_at: "2025-02-20",
  technologies: ["React", "Node.js", "Python"],
  is_active: true,
};

/* -------------------------- Yardımcılar -------------------------- */
function classNames(...arr) { return arr.filter(Boolean).join(" "); }

function mdLikeToHtml(text) {
  const strong = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  const bullets = strong.replace(/^-\s+/gm, "• ");
  const paragraphs = bullets
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return paragraphs;
}

function formatDate(dt) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(dt));
  } catch { return dt; }
}

const statusMap = {
  PLANNING: { label: "Planlama", icon: Hourglass, cls: "bg-sky-100 text-sky-700 ring-sky-200" },
  IN_PROGRESS: { label: "Geliştirme", icon: Rocket, cls: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
  COMPLETED: { label: "Tamamlandı", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  ON_HOLD: { label: "Beklemede", icon: PauseCircle, cls: "bg-amber-100 text-amber-800 ring-amber-200" },
  CANCELLED: { label: "İptal", icon: XCircle, cls: "bg-rose-100 text-rose-700 ring-rose-200" },
};

/* -------------------------- Sayfa -------------------------- */
export default function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const projectData = await projectService.getBySlug(slug);
        if (!projectData) {
          setError("Proje bulunamadı");
          return;
        }
        
        // Parse technologies string to array
        const processedProject = {
          ...projectData,
          technologies: projectData.technologies ? 
            projectData.technologies.split(',').map(tech => tech.trim()).filter(Boolean) : [],
          team_members: projectData.team_members ? 
            projectData.team_members.split(',').map(member => member.trim()).filter(Boolean) : []
        };
        
        setProject(processedProject);
      } catch (err) {
        console.error('Error loading project:', err);
        setError("Proje yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadProject();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Proje yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const st = statusMap[project.status] || statusMap.IN_PROGRESS;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero */}
      <header className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:pt-14">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          <a href="/projeler" className="hover:underline">Projeler</a>
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
          <div className="grid gap-0 md:grid-cols-5">
            {/* Görsel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="md:col-span-2"
            >
              <div className="relative h-64 w-full overflow-hidden md:h-full md:rounded-l-3xl">
                <img 
                  src={getImageUrl(project.image_url, '/assets/images/img_source_code.png')} 
                  alt={project.title} 
                  className="h-full w-full object-cover md:rounded-l-3xl"
                  onError={(e) => handleImageError(e, '/assets/images/img_source_code.png')}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:rounded-l-3xl" />
              </div>
            </motion.div>

            {/* Metin */}
            <div className="flex flex-col justify-center gap-5 p-6 md:col-span-3 md:p-10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700"><TagIcon className="h-3.5 w-3.5" /> {project.category?.name || "Proje"}</span>
                <StatusPill st={st} />
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(project.created_at)}</span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
              <p className="max-w-2xl text-slate-600">{project.description}</p>

              {/* Teknolojiler */}
              {!!project.technologies?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((t) => (
                    <TechBadge key={t} label={t} />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {project.github_url && (
                  <DarkButton as="a" href={project.github_url}><Github className="h-4 w-4" /> GitHub</DarkButton>
                )}
                {project.live_url && (
                  <DarkButton as="a" href={project.live_url}><Globe className="h-4 w-4" /> Canlı Demo</DarkButton>
                )}
                <GhostButton onClick={() => shareProject(project)}><Share2 className="h-4 w-4" /> Paylaş</GhostButton>
              </div>

              {/* Ekip */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <div className="inline-flex items-center gap-2 text-slate-600"><Users className="h-4 w-4" /> Proje Ekibi:</div>
                <div className="flex flex-wrap gap-1">
                  {project.team_members?.map((m) => (
                    <MemberChip key={m} name={m} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      {/* İçerik */}
      <main className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            className="md:col-span-2"
          >
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Proje Açıklaması</h2>
              <div className="prose max-w-none text-slate-700 prose-p:leading-relaxed prose-li:marker:text-slate-500" dangerouslySetInnerHTML={{ __html: mdLikeToHtml(project.content || "") }} />
            </Card>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            className="md:col-span-1"
          >
            <StickyInfo project={project} />
          </motion.aside>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-center text-sm text-slate-500">
        MACS • Matematik ve Bilgisayar Bilimleri Topluluğu
      </footer>
    </div>
  );
}

/* -------------------------- Bileşenler -------------------------- */
function StatusPill({ st }) {
  const Icon = st.icon;
  return (
    <span className={classNames("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1", st.cls)}>
      <Icon className="h-3.5 w-3.5" /> {st.label}
    </span>
  );
}

function Card({ children, className }) {
  return (
    <div className={classNames("rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200", className)}>
      {children}
    </div>
  );
}

function MemberChip({ name }) {
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[11px] ring-1 ring-slate-200">{initials}</span>
      {name}
    </span>
  );
}

function StickyInfo({ project }) {
  return (
    <div className="sticky top-6">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Özet</h3>
        <InfoRow icon={TagIcon} label="Kategori" value={project.category?.name || "-"} />
        <InfoRow icon={CalendarDays} label="Oluşturulma" value={formatDate(project.created_at)} />
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 py-3 last:border-none">
      <Icon className="mt-0.5 h-4 w-4 text-slate-500" />
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function TechBadge({ label }) {
  const colors = {
    React: "bg-cyan-100 text-cyan-800",
    "Node.js": "bg-green-100 text-green-800",
    Python: "bg-yellow-100 text-yellow-800",
  };
  const cls = colors[label] || "bg-slate-100 text-slate-700";
  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", cls)}>
      <Code2 className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function DarkButton({ children, as: Comp = "button", ...props }) {
  return (
    <Comp
      {...props}
      className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white shadow transition-transform duration-200 hover:scale-105 hover:bg-slate-800"
    >
      {children}
    </Comp>
  );
}

function GhostButton({ children, as: Comp = "button", ...props }) {
  return (
    <Comp
      {...props}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Comp>
  );
}

async function shareProject(project) {
  const text = `${project.title} — ${project.description}`;
  const url = typeof window !== "undefined" ? window.location.href : project.live_url;
  try {
    if (navigator.share) {
      await navigator.share({ title: project.title, text, url });
    } else {
      await navigator.clipboard.writeText(url || "");
      alert("Bağlantı kopyalandı ✨");
    }
  } catch {}
}

/* -------------------------- Mini Testler -------------------------- */
function runProjectDetailTests() {
  try {
    console.assert(Array.isArray(demoProject.technologies) && demoProject.technologies.includes("React"), "Teknoloji alanı hatalı");
    console.log("[ProjectDetail] Mini testler geçti ✅");
  } catch (e) {
    console.error("[ProjectDetail] Test hata ❌", e);
  }
}
if (typeof window !== "undefined" && !window.__PROJECT_DETAIL_TESTED__) {
  runProjectDetailTests();
  window.__PROJECT_DETAIL_TESTED__ = true;
}
