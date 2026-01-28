import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trophy, Sparkles, Filter, Code, Heart, UserCircle, Rocket } from 'lucide-react';
import { MOCK_PROJECTS, MOCK_USERS, PROJECT_CATEGORIES } from '../data/mockProjectsData';
import NewProjectCard from '../components/NewProjectCard';
import StatsCounter from '../components/StatsCounter';

/**
 * New ProjectsPage Component
 * Modern tab-based project showcase with filters
 */
const NewProjectsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('developed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter Logic
  const filteredProjects = useMemo(() => {
    return MOCK_PROJECTS.filter(p => {
      const matchesTab = p.tab === activeTab;
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      return matchesTab && matchesSearch && matchesCategory;
    });
  }, [activeTab, searchQuery, selectedCategory]);

  const featuredProject = MOCK_PROJECTS.find(p => p.featured && p.tab === activeTab) || filteredProjects[0];
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
    <div className="min-h-screen bg-[#050B14] text-white overflow-x-hidden relative pt-32">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute top-40 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

      <div className="container mx-auto px-4 py-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
              <span className="text-white">MACS</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> Projeleri</span>
            </h1>
            <p className="text-gray-400 max-w-lg text-lg">
              Matematik ve Bilgisayar Bilimleri topluluğu olarak geliştirdiğimiz yenilikçi çözümler ve öğrenci projeleri.
            </p>
          </div>
          
          <div className="flex gap-6">
            <StatsCounter end={MOCK_PROJECTS.length} label="Toplam Proje" />
            <StatsCounter end={42} label="Katılımcı" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <TabButton id="developed" label="Developed by MACS" icon={Code} />
          <TabButton id="supported" label="Supported by MACS" icon={Heart} />
          <TabButton id="showcase" label="Member Showcase" icon={UserCircle} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Filters */}
          <div className="hidden lg:block lg:col-span-3 space-y-8 sticky top-24 h-fit">
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
                {PROJECT_CATEGORIES.map(cat => (
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
          </div>

          {/* Main Content */}
          <div className="col-span-1 lg:col-span-6 space-y-8">
            
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
                 {PROJECT_CATEGORIES.map(cat => (
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
              <div 
                onClick={() => navigate(`/projeler/${featuredProject.id}`)}
                className="relative group w-full h-[400px] rounded-[2rem] overflow-hidden cursor-pointer border border-white/5 hover:border-blue-500/50 transition-all duration-500 shadow-2xl"
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
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{featuredProject.title}</h2>
                  <p className="text-gray-300 line-clamp-2 max-w-2xl mb-4">{featuredProject.shortDescription}</p>
                  <div className="flex gap-2">
                    {featuredProject.tags.map(t => (
                      <span key={t} className="px-3 py-1 bg-white/10 rounded-md text-xs backdrop-blur-sm border border-white/5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
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
          </div>

          {/* Right Sidebar - Leaderboard */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="sticky top-24 space-y-6">
              
              {/* Leaderboard Card */}
              <div className="bg-[#1A2332]/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-white/5 flex items-center gap-2">
                  <Trophy className="text-yellow-400" />
                  <h3 className="font-bold text-lg">Top Contributors</h3>
                </div>
                <div className="p-4 space-y-4">
                  {MOCK_USERS.sort((a, b) => b.projectCount - a.projectCount).slice(0, 5).map((user, idx) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${idx === 0 ? 'bg-yellow-500 text-black' : 
                          idx === 1 ? 'bg-gray-300 text-black' : 
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300'}
                      `}>
                        {idx + 1}
                      </div>
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-white/10" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.projectCount} Proje</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-center relative overflow-hidden shadow-lg group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                  <Rocket className="mx-auto mb-3 text-white/80 group-hover:animate-bounce" size={40} />
                  <h3 className="text-xl font-bold mb-2">Projelere Katıl!</h3>
                  <p className="text-blue-100 text-sm mb-4">Fikirlerinle katkıda bulun veya ekibimize katıl.</p>
                  <a 
                    href="https://forms.gle/MXaCH1YG3qE4rsX36"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
                  >
                    Bize Ulaş
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NewProjectsPage;
