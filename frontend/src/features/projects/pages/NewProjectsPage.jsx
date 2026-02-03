import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Trophy, Sparkles, Filter, Code, Heart, UserCircle, Rocket } from 'lucide-react';
import { MOCK_USERS, PROJECT_CATEGORIES } from '../data/mockProjectsData';
import { mockProjects, mockProjectCategories } from '../data/mockProjects';
import { projectService, memberService } from '../../../shared/services/api';
import NewProjectCard from '../components/NewProjectCard';
import StatsCounter from '../components/StatsCounter';
import { getMediaUrl } from '../../../shared/utils/media';
import { motion, AnimatePresence } from 'framer-motion';
import Loading from '../../../shared/components/feedback/Loading';
import SEO from '../../../shared/components/seo/SEO';

/**
 * New ProjectsPage Component
 * Modern tab-based project showcase with filters
 */
const NewProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('developed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [leaderboard, setLeaderboard] = useState([]);
  const [memberCount, setMemberCount] = useState(0);

  // Backend'den projeleri ve kategorileri çek
  React.useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();
      try {
        setLoading(true);
        const [projectsData, categoriesData, leaderboardData, membersData] = await Promise.all([
          projectService.getAll(),
          projectService.getCategories(),
          memberService.getLeaderboard(5),
          memberService.getAll({ limit: 200 }).catch(() => [])
        ]);
        
        // Leaderboard
        setLeaderboard(leaderboardData || []);
        
        // Member count
        setMemberCount(membersData.length || MOCK_USERS.length);
        
        // Projects handling
        setProjects(projectsData.length > 0 ? projectsData : mockProjects.map(projectService._mapProject));
        
        // Categories handling
        if (categoriesData && categoriesData.length > 0) {
          const catNames = ['All', ...categoriesData.map(c => c.name)];
          setCategories(catNames);
        } else {
          setCategories(['All', ...mockProjectCategories.map(c => c.name)]);
        }
      } catch (error) {
        console.error("Veri çekilemedi, anasayfa mock datası kullanılıyor:", error);
        setProjects(mockProjects.map(projectService._mapProject));
        setCategories(['All', ...mockProjectCategories.map(c => c.name)]);
      } finally {
        // En az 0.4 saniye bekle (akıcı geçiş için)
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(400 - elapsedTime, 0);
        
        setTimeout(() => {
          setLoading(false);
        }, remainingTime);
      }
    };
    fetchData();
  }, []);

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

  const featuredProject = projects.find(p => (p.is_featured || p.featured) && p.tab === activeTab) || filteredProjects[0];
  const gridProjects = filteredProjects.filter(p => p.id !== featuredProject?.id);

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSelectedCategory('All');
      }}
      className={`relative px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 font-medium ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' 
          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <>
      <SEO 
        title="Projeler"
        description="MACS topluluğu üyelerinin geliştirdiği yazılım projeleri: Web, mobil, yapay zeka ve oyun projeleri. Açık kaynak ve inovatif çalışmalar."
        keywords="MACS projeleri, yazılım projeleri, açık kaynak, web geliştirme, mobil uygulama, yapay zeka, ESOGÜ"
        url="https://esogumacs.com/projeler"
      />
      <div className="min-h-screen bg-[#050B14] text-white overflow-x-hidden relative pt-32">
        <AnimatePresence mode="wait">
        {loading ? (
          <Loading variant="dark" />
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute top-40 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

            <div className="container mx-auto px-4 py-12 relative z-10">
              
              {/* Header Section - Soldan giriş */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
                <motion.div 
                  className="text-center md:text-left"
                  initial={{ opacity: 0, x: -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                    <span className="text-white">MACS</span>
                    <span className="text-blue-400 font-medium"> Projeleri</span>
                  </h1>
                  <p className="text-gray-400 max-w-lg text-lg">
                    Matematik ve Bilgisayar Bilimleri topluluğu olarak geliştirdiğimiz yenilikçi çözümler ve öğrenci projeleri.
                  </p>
                </motion.div>
                
                {/* Stats - Sağdan giriş */}
                <motion.div 
                  className="flex gap-6"
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <StatsCounter end={projects.length} label="Toplam Proje" />
                  <StatsCounter end={memberCount} label="Katılımcı" />
                </motion.div>
              </div>

              {/* Tabs - Yukarıdan giriş */}
              <motion.div 
                className="flex flex-wrap justify-center gap-4 mb-12"
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <TabButton id="developed" label="Developed by MACS" icon={Code} />
                <TabButton id="supported" label="Supported by MACS" icon={Heart} />
                <TabButton id="showcase" label="Member Showcase" icon={UserCircle} />
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Sidebar - Filters - Soldan giriş */}
                <motion.div 
                  className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="bg-[#1A2332]/50 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Proje ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-4 text-blue-400 font-semibold">
                      <Filter size={20} />
                      <span>Kategoriler</span>
                    </div>
                    
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex justify-between items-center group ${
                            selectedCategory === cat 
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                              : 'hover:bg-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          {cat}
                          {selectedCategory === cat && <Sparkles size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Main Content - Aşağıdan yukarı giriş */}
                <motion.div 
                  className="col-span-1 lg:col-span-6 space-y-8"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  
                  {/* Mobile Search/Filter */}
                  <div className="lg:hidden bg-[#1A2332]/50 backdrop-blur-md rounded-2xl p-4 border border-white/5 mb-6">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Proje ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm ${
                              selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            {cat}
                          </button>
                      ))}
                    </div>
                  </div>

                  {/* Featured Project */}
                  {featuredProject && (
                    <motion.div 
                      onClick={() => navigate(`/projeler/${featuredProject.slug}`)}
                      className="relative group w-full h-[400px] rounded-[2rem] overflow-hidden cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all duration-500 shadow-2xl"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-10" />
                      <img 
                        src={featuredProject.imageUrl} 
                        alt={featuredProject.title} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                      />
                      
                      <div className="absolute top-6 left-6 z-20">
                        <span className="flex items-center gap-2 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-md">
                          <Sparkles size={14} fill="currentColor" />
                          ÖNE ÇIKAN
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                        <Link to={`/projeler/${featuredProject.slug}`} className="hover:underline">
                          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{featuredProject.title}</h2>
                        </Link>
                        <p className="text-gray-300 line-clamp-2 max-w-2xl mb-4">{featuredProject.shortDescription}</p>
                        <div className="flex gap-2">
                          {featuredProject.tags.map(t => (
                            <span key={t} className="px-3 py-1 bg-white/10 rounded-md text-xs backdrop-blur-sm border border-white/5">{t}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Grid Projects */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gridProjects.length > 0 ? (
                      gridProjects.map(project => (
                        <NewProjectCard key={project.id} project={project} />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-gray-500 bg-[#1A2332]/30 rounded-3xl border border-white/5">
                        Proje bulunamadı.
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Right Sidebar - Leaderboard - Sağdan giriş */}
                <motion.div 
                  className="col-span-1 lg:col-span-3 space-y-6"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="sticky top-24 space-y-6">
                    
                    {/* Leaderboard Card */}
                    <div className="bg-[#1A2332]/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
                      <div className="p-5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-white/5 flex items-center gap-2">
                        <Trophy className="text-yellow-400" />
                        <h3 className="font-bold text-lg">Top Contributors</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {(leaderboard.length > 0 ? leaderboard : MOCK_USERS).slice(0, 5).map((user, idx) => (
                          <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${idx === 0 ? 'bg-yellow-500 text-black' : 
                                idx === 1 ? 'bg-gray-300 text-black' : 
                                idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300'}
                            `}>
                              {idx + 1}
                            </div>
                            <img 
                              src={user.avatar_url || user.avatar || getMediaUrl(user.profile_image, user.full_name || user.name)} 
                              alt={user.full_name || user.name} 
                              className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{user.full_name || user.name}</p>
                              <p className="text-xs text-gray-500">{user.project_count || user.projectCount || 0} Proje</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Card */}
                    <motion.div 
                      className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-center relative overflow-hidden shadow-lg group"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                      <div className="relative z-10">
                        <img 
                          src="/assets/images/img_920228d74c2145d3b604e2dfb42f2d3f1201a_1.png" 
                          alt="MACS Logo" 
                          className="mx-auto mb-4 w-12 h-12 object-contain opacity-90 drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] group-hover:animate-bounce"
                        />
                        <h3 className="text-xl font-bold mb-2">Projelere Katıl!</h3>
                        <p className="text-blue-100 text-sm mb-4">Fikirlerinle katkıda bulun veya ekibimize katıl.</p>
                        <a 
                          href="https://forms.gle/MXaCH1YG3qE4rsX36"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg cursor-pointer"
                        >
                          Bize Ulaş
                        </a>
                      </div>
                    </motion.div>

                  </div>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NewProjectsPage;
