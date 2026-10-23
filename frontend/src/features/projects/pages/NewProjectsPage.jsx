import React, { useState, useMemo, useRef } from 'react';
import { Code, Heart, UserCircle } from 'lucide-react';
import { MOCK_USERS } from '../data/mockProjectsData';
import { mockProjects, mockProjectCategories } from '../data/mockProjects';
import { projectService, memberService } from '../../../shared/services/api';
import NewProjectCard from '../components/NewProjectCard';
import ProjectsToolbar from '../components/ProjectsToolbar';
import TopContributors from '../components/TopContributors';
import ProjectsPageSkeleton from '../components/ProjectsPageSkeleton';
import { ProjectShowcase } from '../components/ProjectShowcase';
import { GlassFold } from 'components/ui/glass-fold';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorMessage from '../../../shared/components/feedback/ErrorMessage';
import SEO from '../../../shared/components/seo/SEO';
import { USE_MOCK_FALLBACK } from '../../../shared/utils/mockFallback';

const TABS = [
  { id: 'developed', label: 'Developed by MACS', icon: Code },
  { id: 'supported', label: 'Supported by MACS', icon: Heart },
  { id: 'showcase', label: 'Member Showcase', icon: UserCircle },
];

/** Mozaikte her 5 kartta bir geniş kutu: ritim verir, boşluk bırakmaz (grid-flow dense). */
const WIDE_EVERY = 5;
const WIDE_OFFSET = 3;

/**
 * New ProjectsPage Component
 * Üstte canlı vitrin, altında düz renkli filtre çubuğu ve mozaik proje listesi.
 */
const NewProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('developed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [leaderboard, setLeaderboard] = useState([]);
  // Vitrin hareketi ve vurgu rengi arka plan shader'ına state'siz, karede bir okunur.
  const backdropSignal = useRef({ energy: 0 });

  // Backend'den projeleri ve kategorileri çek
  const fetchData = React.useCallback(async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      const [projectsData, categoriesData, leaderboardData] = await Promise.all([
        projectService.getAll(),
        projectService.getCategories(),
        memberService.getLeaderboard(5)
      ]);

      setLeaderboard(leaderboardData || []);

      // Boş liste geçerli bir yanıt: "henüz proje yok" demek, hata değil.
      setProjects(projectsData || []);
      setCategories(['All', ...(categoriesData || []).map(c => c.name)]);
      setError(null);
    } catch (err) {
      console.error("Projeler yüklenemedi:", err);

      if (USE_MOCK_FALLBACK) {
        setProjects(mockProjects.map(projectService._mapProject));
        setCategories(['All', ...mockProjectCategories.map(c => c.name)]);
        setError(null);
      } else {
        setProjects([]);
        setCategories(['All']);
        setError('Projeler yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      // En az 0.4 saniye bekle (akıcı geçiş için)
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(400 - elapsedTime, 0);

      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter Logic
  const filteredProjects = useMemo(() => {
    // Tab -> project_type eşleşmesi
    const tabToType = {
      'developed': 'DEVELOPED_BY_MACS',
      'supported': 'SUPPORTED_BY_MACS',
      'showcase': 'MEMBER_SHOWCASE'
    };

    return projects.filter(p => {
      // project_type veya tab ile eşleştir (mock data için geriye uyumluluk)
      const projectType = p.project_type || (p.tab ? tabToType[p.tab] : null);
      const matchesTab = projectType === tabToType[activeTab] || p.tab === activeTab;

      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) || false);
      const matchesCategory = selectedCategory === 'All' || p.category?.name === selectedCategory || p.category === selectedCategory;

      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [projects, activeTab, searchQuery, selectedCategory]);

  // Öne çıkan da filtrelere uyar; aksi halde arama/kategori dışı bir proje üstte kalırdı.
  const featuredProject = filteredProjects.find(p => p.is_featured || p.featured) || filteredProjects[0];
  const gridProjects = filteredProjects.filter(p => p.id !== featuredProject?.id);
  const contributors = leaderboard.length > 0 ? leaderboard : (USE_MOCK_FALLBACK ? MOCK_USERS : []);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSelectedCategory('All');
  };

  return (
    <>
      <SEO
        title="Projeler"
        description="MACS topluluğu üyelerinin geliştirdiği yazılım projeleri: Web, mobil, yapay zeka ve oyun projeleri. Açık kaynak ve inovatif çalışmalar."
        keywords="MACS projeleri, yazılım projeleri, açık kaynak, web geliştirme, mobil uygulama, yapay zeka, ESOGÜ"
        url="https://macsclub.com.tr/projeler"
      />
      {/* overflow-x-clip: overflow-x-hidden kaydırma kutusu yaratıp yapışkan (sticky) öğeleri kırar. */}
      <div className="min-h-screen bg-[#140b22] text-white overflow-x-clip relative isolate">
        {/* Tek viewport boyutunda canvas: sayfa uzadıkça desen gerilmez. */}
        <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-[#140b22]">
          {/* Geçici Halloween paleti; GlassFold varsayılanları mavi kalır. */}
          <GlassFold color1="#783517" color2="#140b22" color3="#ff9a3d" live={backdropSignal} />
        </div>
        <div className="relative z-10">
        <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ProjectsPageSkeleton />
          </motion.div>
        ) : error ? (
          <div className="pt-32 pb-16 px-4">
            <ErrorMessage message={error} onRetry={fetchData} />
          </div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ProjectShowcase projects={projects} live={backdropSignal} />

            {/* İÇERİK: vitrinden sonra, arka planın durduğu bölge. Düz yüzeyler, blur yok. */}
            <div id="projeler-icerik" className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 pb-16 relative z-10 scroll-mt-20">
              <ProjectsToolbar
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultCount={filteredProjects.length}
              />

              {/* key: sekme veya kategori değişince ızgara yeniden kurulur, kartlar baştan sırayla girer. */}
              <div
                key={`${activeTab}|${selectedCategory}`}
                className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 [grid-auto-flow:dense]"
              >
                {featuredProject && (
                  <NewProjectCard key={featuredProject.id} project={featuredProject} variant="featured" index={0} />
                )}
                {gridProjects.map((project, index) => (
                  <NewProjectCard
                    key={project.id}
                    project={project}
                    index={index + 1}
                    variant={index % WIDE_EVERY === WIDE_OFFSET ? 'wide' : 'default'}
                  />
                ))}
                {!featuredProject && (
                  <div className="col-span-full rounded-3xl border border-white/10 bg-[#1a2333] py-12 text-center text-gray-400">
                    Proje bulunamadı.
                  </div>
                )}
              </div>

              <div className="mt-10 space-y-6">
                <TopContributors users={contributors} />

                <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-macs-accent-500 to-macs-accent-700 p-6 text-center sm:flex-row sm:text-left">
                  <img
                    src="/assets/images/img_920228d74c2145d3b604e2dfb42f2d3f1201a_1.png"
                    alt="MACS Logo"
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 object-contain"
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Projelere Katıl!</h2>
                    <p className="text-sm text-macs-accent-100">Fikirlerinle katkıda bulun veya ekibimize katıl.</p>
                  </div>
                  <a
                    href="https://forms.gle/MXaCH1YG3qE4rsX36"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-xl bg-white px-6 py-3 font-bold text-macs-accent-600 transition-colors hover:bg-macs-accent-50"
                  >
                    Bize Ulaş
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default NewProjectsPage;
