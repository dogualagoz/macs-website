import React from 'react';
import { Project } from '../types';
import { ArrowRight, Github, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group relative bg-macs-card/80 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] cursor-pointer flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-macs-card to-transparent z-10 opacity-60" />
        <img 
          src={project.imageUrl} 
          alt={project.title} 
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-4 left-4 z-20">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
            {project.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow relative z-20">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
          {project.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-grow">
          {project.shortDescription}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
              +{project.tags.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div className="flex -space-x-2">
            {project.team.map((member, i) => (
              <img 
                key={i}
                src={member.avatar} 
                alt={member.name}
                className="w-8 h-8 rounded-full border-2 border-macs-card"
                title={member.name}
              />
            ))}
          </div>
          <button className="p-2 rounded-full bg-white/5 text-white hover:bg-blue-600 hover:text-white transition-colors">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;