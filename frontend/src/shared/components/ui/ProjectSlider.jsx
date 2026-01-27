/**
 * ProjectSlider Component
 * 
 * Modern slider/carousel for displaying projects with smooth animations.
 * Uses framer-motion for gesture support and transitions.
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Code2, Users, ChevronLeft, ChevronRight, Github, ExternalLink } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';
import '../../../styles/components/slider.css';

const statusMap = {
    PLANNING: { label: 'Planlama', color: 'status-planning' },
    IN_PROGRESS: { label: 'Geliştirme', color: 'status-progress' },
    COMPLETED: { label: 'Tamamlandı', color: 'status-completed' },
    ON_HOLD: { label: 'Beklemede', color: 'status-hold' },
    CANCELLED: { label: 'İptal', color: 'status-cancelled' },
};

const ProjectSlider = ({ projects = [] }) => {
    const allProjects = projects;

    const [direction, setDirection] = useState(0);

    // Navigate to previous cards
    const handlePrev = () => {
        const container = document.querySelector('.slider-grid-scroll');
        if (container) {
            container.scrollBy({ left: -container.offsetWidth, behavior: 'smooth' });
        }
    };

    // Navigate to next cards
    const handleNext = () => {
        const container = document.querySelector('.slider-grid-scroll');
        if (container) {
            container.scrollBy({ left: container.offsetWidth, behavior: 'smooth' });
        }
    };

    // Parse technologies string to array
    const parseTechnologies = (tech) => {
        if (!tech) return [];
        return tech.split(',').map(t => t.trim()).filter(Boolean);
    };

    // Parse team members string to array
    const parseTeamMembers = (members) => {
        if (!members) return [];
        return members.split(',').map(m => m.trim()).filter(Boolean);
    };

    // Animation variants
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0
        })
    };

    if (allProjects.length === 0) {
        return <div className="slider-empty">Gösterilecek proje yok.</div>;
    }

    return (
        <div className="slider-container project-slider">
            {/* Slider Viewport */}
            <div className="slider-viewport">
                <div className="slider-slide slider-slide-multi">
                    <div className="slider-grid slider-grid-scroll">
                        {allProjects.map((project) => {
                            const statusInfo = statusMap[project.status] || statusMap.PLANNING;
                            const techArray = parseTechnologies(project.technologies);
                            const teamArray = parseTeamMembers(project.team_members);
                            
                            return (
                                <Link key={project.id || project.slug} to={`/projeler/${project.slug || ''}`} className="slider-card-link">
                                    <div className="slider-card slider-card-compact project-card-slide">
                                        {/* Image Section */}
                                        <div className="slider-card-image">
                                            <img
                                                src={getImageUrl(project.image_url || project.image)}
                                                alt={project.title}
                                                onError={(e) => handleImageError(e, '/assets/images/img_source_code.png')}
                                            />
                                        </div>

                                        {/* Content Section */}
                                        <div className="slider-card-content">
                                            {/* Category */}
                                            <div className="slider-card-category">
                                                <Code2 className="category-icon" />
                                                <span>{project.category?.name || 'Proje'}</span>
                                            </div>

                                            <h3 className="slider-card-title">{project.title}</h3>

                                            <p className="slider-card-description">
                                                {project.description}
                                            </p>

                                            {/* Technologies */}
                                            {techArray.length > 0 && (
                                                <div className="slider-card-tags">
                                                    {techArray.slice(0, 4).map((tech, index) => (
                                                        <span key={index} className="slider-tag">{tech}</span>
                                                    ))}
                                                    {techArray.length > 4 && (
                                                        <span className="slider-tag-more">+{techArray.length - 4}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Team Members */}
                                            {teamArray.length > 0 && (
                                                <div className="slider-card-team">
                                                    <Users className="team-icon" />
                                                    <span>
                                                        {teamArray.slice(0, 2).join(', ')}
                                                        {teamArray.length > 2 && ` +${teamArray.length - 2}`}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="slider-card-actions">
                                                <span className="slider-action-button primary">
                                                    <ExternalLink className="action-icon" />
                                                    Projeyi İncele
                                                </span>
                                                {project.github_url && (
                                                    <a
                                                        href={project.github_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="slider-action-button secondary"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Github className="action-icon" />
                                                        GitHub
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            {allProjects.length > 3 && (
                <>
                    <button
                        className="slider-nav slider-nav-prev"
                        onClick={handlePrev}
                        aria-label="Önceki proje"
                    >
                        <ChevronLeft />
                    </button>
                    <button
                        className="slider-nav slider-nav-next"
                        onClick={handleNext}
                        aria-label="Sonraki proje"
                    >
                        <ChevronRight />
                    </button>
                </>
            )}
        </div>
    );
};

ProjectSlider.propTypes = {
    projects: PropTypes.array
};

export default ProjectSlider;
