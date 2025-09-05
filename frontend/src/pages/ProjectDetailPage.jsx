import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectBySlug } from '../services/api';
import '../styles/components/projects.css';
import { getImageUrl, handleImageError } from '../utils/imageUtils';

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // getImageUrl artık import edildi

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const found = await fetchProjectBySlug(slug);
        setProject(found || null);
        if (!found) setError('Proje bulunamadı');
      } catch (err) {
        console.error(err);
        setError('Proje yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return <div className="projects-section loading">Yükleniyor...</div>;
  if (error) return <div className="projects-section error">{error}</div>;
  if (!project) return null;

  const techArray = project.technologies ? project.technologies.split(',').map(t => t.trim()) : [];

  return (
    <section className="projects-section">
      <div className="projects-container" style={{ maxWidth: 960 }}>
        <Link to="/projeler" style={{ textDecoration: 'none' }}>&larr; Projelere Dön</Link>
        <h1 className="section-title" style={{ textAlign: 'left' }}>{project.title}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <div style={{ background: '#F9FAFB', border: '1px solid #E1E1E1', borderRadius: 10, overflow: 'hidden' }}>
            <img 
              src={getImageUrl(project.image_url, '/assets/images/img_source_code.png')} 
              alt={project.title} 
              style={{ width: '100%', height: 360, objectFit: 'cover' }}
              onError={(e) => handleImageError(e, '/assets/images/img_source_code.png')}
            />
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ color: '#4B5563', lineHeight: 1.7 }}>{project.description}</p>

            {techArray.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {techArray.map(tech => (
                  <span key={tech} className="tech-tag">{tech}</span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              {project.github_url && (
                <a className="all-projects-button" href={project.github_url} target="_blank" rel="noreferrer">GitHub</a>
              )}
              {project.live_url && (
                <a className="all-projects-button" href={project.live_url} target="_blank" rel="noreferrer">Canlı Demo</a>
              )}
            </div>

            <div style={{ marginTop: 16, color: '#6B7280' }}>
              <div><strong>Kategori:</strong> {project.category?.name || '—'}</div>
              <div><strong>Takım:</strong> {project.team_members || '—'}</div>
              <div><strong>Durum:</strong> {project.status || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


