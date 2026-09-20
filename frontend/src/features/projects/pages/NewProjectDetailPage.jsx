import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Calendar, Layers, Activity, Share2 } from 'lucide-react';
import { MOCK_PROJECTS } from '../data/mockProjectsData';
import { projectService } from '../../../shared/services/api';
import Loading from '../../../shared/components/feedback/Loading';
import ErrorMessage from '../../../shared/components/feedback/ErrorMessage';
import { USE_MOCK_FALLBACK } from '../../../shared/utils/mockFallback';
import { handleAvatarError, handleImageError } from '../../../utils/imageUtils';
import SEO from '../../../shared/components/seo/SEO';

/**
 * New ProjectDetailPage Component
 * Hero section with blur backdrop and detailed project info
 */
const NewProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const shareData = {
      title: project?.title || 'MACS Proje',
      text: project?.shortDescription || 'MACS topluluğu projesine göz atın!',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Paylaşım hatası:', err);
    }
  };

  const fetchProject = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectService.getBySlug(id);

      if (data) {
        setProject(data);
      } else if (USE_MOCK_FALLBACK) {
        const mock = MOCK_PROJECTS.find(p => p.id === id || p.slug === id);
        setProject(mock ? projectService._mapProject(mock) : null);
      } else {
        // Backend "bulunamadı" dedi: bu bir hata değil, 404 durumu.
        setProject(null);
      }
      setError(null);
    } catch (err) {
      console.error("Proje detayı yüklenemedi:", err);

      if (USE_MOCK_FALLBACK) {
        const mock = MOCK_PROJECTS.find(p => p.id === id || p.slug === id);
        setProject(mock ? projectService._mapProject(mock) : null);
        setError(null);
      } else {
        setProject(null);
        setError('Proje yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return <Loading variant="dark" />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchProject} />;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07132b] text-white">
        <h2 className="text-3xl font-bold mb-4">Proje Bulunamadı</h2>
        <Link to="/projeler" className="text-blue-400 hover:underline">Geri Dön</Link>
      </div>
    );
  }

  return (
    <>
    <SEO
      title={project.title}
      description={(project.shortDescription || '').slice(0, 160)}
      image={project.imageUrl}
      url={`https://macsclub.com.tr/projeler/${id}`}
      type="article"
    />
    <div className="min-h-screen bg-[#07132b] text-slate-200 pt-32">
      
      {/* Hero Section with Blur Backdrop */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover opacity-40 blur-sm" onError={handleImageError} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07132b] via-[#07132b]/80 to-transparent" />
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
            <a 
              href={project.githubUrl || "#"} 
              target={project.githubUrl ? "_blank" : "_self"}
              rel="noopener noreferrer" 
              className={`flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl backdrop-blur-md border border-white/10 transition-all font-medium ${!project.githubUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => !project.githubUrl && e.preventDefault()}
            >
              <Github size={20} />
              GitHub
            </a>
            <a 
              href={project.liveUrl || "#"} 
              target={project.liveUrl ? "_blank" : "_self"}
              rel="noopener noreferrer" 
              className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)] ${!project.liveUrl ? 'opacity-50 cursor-not-allowed bg-blue-600/50 shadow-none' : ''}`}
              onClick={(e) => !project.liveUrl && e.preventDefault()}
            >
              <ExternalLink size={20} />
              Canlı Demo
            </a>
            <div className="relative">
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-3 rounded-xl backdrop-blur-md border border-white/5 transition-all"
                title="Paylaş"
              >
                <Share2 size={20} />
              </button>
              
              {copied && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap animate-bounce">
                  Link Kopyalandı!
                </div>
              )}
            </div>
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
                  <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full border border-white/10" onError={(e) => handleAvatarError(e, member.name)} />
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
    </>
  );
};

export default NewProjectDetailPage;
