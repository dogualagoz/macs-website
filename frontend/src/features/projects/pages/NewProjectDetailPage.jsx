import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Calendar, Layers, Activity, Share2 } from 'lucide-react';
import { MOCK_PROJECTS } from '../data/mockProjectsData';
import { projectService } from '../../../shared/services/api';

/**
 * New ProjectDetailPage Component
 * Hero section with blur backdrop and detailed project info
 */
const NewProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        // Önce backend'den slug/id ile çekmeyi dene
        const data = await projectService.getBySlug(id);
        if (data) {
          setProject(data);
        } else {
          // Bulunamazsa Mock'tan bak
          const mock = MOCK_PROJECTS.find(p => p.id === id || p.slug === id);
          setProject(mock ? projectService._mapProject(mock) : null);
        }
      } catch (error) {
        console.error("Proje detayı çekilemedi:", error);
        const mock = MOCK_PROJECTS.find(p => p.id === id || p.slug === id);
        setProject(mock ? projectService._mapProject(mock) : null);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050B14] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050B14] text-white">
        <h2 className="text-3xl font-bold mb-4">Proje Bulunamadı</h2>
        <Link to="/projeler" className="text-blue-400 hover:underline">Geri Dön</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-200 pt-32">
      
      {/* Hero Section with Blur Backdrop */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover opacity-40 blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-12 relative z-10">
          <Link to="/projeler" className="absolute top-8 left-4 md:left-0 flex items-center gap-2 text-gray-300 hover:text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-full transition-all hover:bg-black/50">
            <ArrowLeft size={18} />
            <span>Projeler'e Dön</span>
          </Link>

          <div className="flex gap-3 mb-4">
             <span className="px-3 py-1 bg-blue-600/30 border border-blue-500/50 text-blue-300 rounded-lg text-sm font-semibold backdrop-blur-md">
                {project.category}
             </span>
             <span className={`px-3 py-1 border rounded-lg text-sm font-semibold backdrop-blur-md ${
                project.status === 'Yayında' ? 'bg-green-600/30 border-green-500/50 text-green-300' :
                project.status === 'Geliştirme Aşamasında' ? 'bg-yellow-600/30 border-yellow-500/50 text-yellow-300' :
                'bg-gray-600/30 border-gray-500/50 text-gray-300'
             }`}>
                {project.status}
             </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
            {project.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl font-light leading-relaxed drop-shadow-md">
            {project.shortDescription}
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            {project.githubUrl && (
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl backdrop-blur-md border border-white/10 transition-all font-medium">
                <Github size={20} />
                GitHub
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <ExternalLink size={20} />
                Canlı Proje
              </a>
            )}
             <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-3 rounded-xl backdrop-blur-md border border-white/5 transition-all">
                <Share2 size={20} />
              </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="container mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-12">
          
          <section>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-blue-500 rounded-full block"></span>
              Proje Hakkında
            </h3>
            <div className="bg-[#1A2332]/50 p-8 rounded-3xl border border-white/5 text-lg leading-relaxed text-gray-300 shadow-xl">
              {project.longDescription}
            </div>
          </section>

          <section>
             <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-purple-500 rounded-full block"></span>
              Teknolojiler
            </h3>
            <div className="flex flex-wrap gap-3">
              {project.tags.map(tag => (
                <div key={tag} className="bg-[#1E293B] border border-white/5 px-6 py-3 rounded-2xl text-blue-200 font-medium hover:bg-[#334155] transition-colors cursor-default">
                  {tag}
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          
          {/* Metadata Card */}
          <div className="bg-[#1A2332]/80 p-6 rounded-3xl border border-white/5 shadow-lg">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6 border-b border-white/5 pb-2">Detaylar</h4>
            <ul className="space-y-5">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar size={18} />
                  <span>Oluşturulma</span>
                </div>
                <span className="text-white font-medium">{project.date}</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Layers size={18} />
                  <span>Tür</span>
                </div>
                <span className="text-white font-medium">{project.category}</span>
              </li>
               <li className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Activity size={18} />
                  <span>Durum</span>
                </div>
                <span className={`font-medium ${
                  project.status === 'Yayında' ? 'text-green-400' : 'text-yellow-400'
                }`}>{project.status}</span>
              </li>
            </ul>
          </div>

          {/* Team Card */}
          <div className="bg-[#1A2332]/80 p-6 rounded-3xl border border-white/5 shadow-lg">
            <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6 border-b border-white/5 pb-2">Proje Ekibi</h4>
            <div className="space-y-4">
              {project.team.map((member, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full border border-white/10" />
                  <div>
                    <p className="text-white font-semibold">{member.name}</p>
                    <p className="text-xs text-blue-400">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default NewProjectDetailPage;
