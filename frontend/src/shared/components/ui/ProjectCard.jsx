/**
 * ProjectCard Component
 * 
 * Displays an individual project card with project details including:
 * - Project image and status
 * - Title and description
 * - Technology tags
 * - Team member information
 * 
 * Design matches EventCard for consistency
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, Users } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

const statusMap = {
  PLANNING: { label: 'Planlama', color: 'bg-sky-100 text-sky-700' },
  IN_PROGRESS: { label: 'Geliştirme', color: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' },
  ON_HOLD: { label: 'Beklemede', color: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'İptal', color: 'bg-rose-100 text-rose-700' },
};

const ProjectCard = ({ 
  slug, 
  title, 
  description, 
  image, 
  technologies, 
  teamMembers, 
  category, 
  status 
}) => {
  const techArray = technologies ? technologies.split(',').map(tech => tech.trim()) : [];
  const teamArray = teamMembers ? teamMembers.split(',').map(member => member.trim()).filter(Boolean) : [];
  
  const statusInfo = statusMap[status] || statusMap.PLANNING;

  return (
    <Link to={`/projeler/${slug}`}>
      <div className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
          <img 
            src={getImageUrl(image)}
            alt={title}
            onError={(e) => handleImageError(e, '/assets/images/img_source_code.png')}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          {/* Category */}
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">{category?.name || 'Proje'}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#07132b] transition">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
            {description}
          </p>

          {/* Technologies */}
          {techArray.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-t">
              {techArray.slice(0, 3).map((tech) => (
                <span 
                  key={tech} 
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  {tech}
                </span>
              ))}
              {techArray.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-slate-600">
                  +{techArray.length - 3} daha
                </span>
              )}
            </div>
          )}

          {/* Team Members */}
          {teamArray.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{teamArray.slice(0, 2).join(', ')}{teamArray.length > 2 ? ` +${teamArray.length - 2}` : ''}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
