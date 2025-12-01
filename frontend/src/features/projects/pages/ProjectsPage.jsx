import React, { useEffect, useMemo, useState } from 'react';
import { FeaturedProjectCard, ProjectCard } from '../../../shared/components/ui';
import { projectService } from '../../../shared/services/api';
import '../../../styles/components/projects.css';
import { Link } from 'react-router-dom';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [list, cats, feat] = await Promise.all([
          projectService.getAll(),
          projectService.getCategories(),
          projectService.getFeatured()
        ]);
        setProjects(list.projects || list || []);
        setCategories(cats || []);
        setFeatured(feat);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return activeFilter ? projects.filter(p => p.category_id === activeFilter) : projects;
  }, [projects, activeFilter]);

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

  return (
    <section className="projects-section">
      <div className="projects-container">
        <h2 className="section-title">Projeler</h2>
        <p className="section-description">Matematik ve bilgisayar bilimleri alanında geliştirdiğimiz yenilikçi projeler ve araştırmalarımız.</p>

        <div className="Buttonss">
          <div className="Buttons">
            <button className={`button ${!activeFilter ? 'active' : ''}`} onClick={() => setActiveFilter(null)}>Tümü</button>
            {categories.map(c => (
              <button key={c.id} className={`button ${activeFilter === c.id ? 'active' : ''}`} onClick={() => setActiveFilter(c.id)}>{c.name}</button>
            ))}
          </div>
        </div>

        {(featured || filtered[0]) && (
          <FeaturedProjectCard
            title={(featured || filtered[0]).title}
            description={(featured || filtered[0]).description}
            image={(featured || filtered[0]).image_url}
            technologies={(featured || filtered[0]).technologies}
            githubUrl={(featured || filtered[0]).github_url}
            liveUrl={(featured || filtered[0]).live_url}
            slug={(featured || filtered[0]).slug}
          />
        )}

        <div className="projects-grid">
          {filtered
            .filter(p => p.id !== (featured || filtered[0])?.id)
            .map(p => (
              <Link key={p.id} to={`/projeler/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <ProjectCard 
                  title={p.title}
                  description={p.description}
                  image={p.image_url}
                  technologies={p.technologies}
                  teamMembers={p.team_members}
                  category={p.category?.name}
                />
              </Link>
            ))}
        </div>

        {filtered.length === 0 && (
          <p className="no-projects">Bu kategoride proje bulunamadı.</p>
        )}
      </div>
    </section>
  );
}


