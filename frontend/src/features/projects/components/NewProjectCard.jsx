import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { handleImageError } from '../../../utils/imageUtils';

const MAX_TAGS = 3;
const MAX_AVATARS = 3;
/** Üstteki vitrinin açılışıyla aynı yay: hafif taşıp oturur. Gecikme sıraya göre artar. */
const ENTER_SPRING = { type: 'spring', stiffness: 90, damping: 15 };
const ENTER_STEP_S = 0.055;
const ENTER_MAX_STEPS = 7;
const ENTER_VARIANTS = {
  hidden: { opacity: 0, y: 56, scale: 0.88 },
  shown: { opacity: 1, y: 0, scale: 1 },
};
const MotionLink = motion.create(Link);

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toLocaleUpperCase('tr-TR') || '?';

/**
 * ProjectCard
 *
 * Alt bölümün kartı. Düz renkli yüzey kullanır: backdrop-filter, büyük gölge
 * geçişi ve ağ üzerinden avatar yok, çünkü arkadaki canlı shader'ın üstünde
 * her biri kare başına yeniden bulanıklaştırılıyordu.
 *
 * variant:
 *  - default: görsel üstte, içerik altta
 *  - wide / featured: görsel kartı doldurur, yazı altta (mozaikte büyük kutular)
 *
 * index: listedeki sıra. Kart ekrana girince (filtre değişince hemen, uzaktaysa
 * kaydırınca) sırasına göre gecikmeli, yaylı bir girişle gelir. Yalnızca
 * transform ve opacity animasyonu: GPU'da ucuz, blur/filter yok.
 */
const ProjectCard = ({ project, variant = 'default', index = 0 }) => {
  const reduced = useReducedMotion();
  const enter = reduced ? {} : {
    variants: ENTER_VARIANTS,
    initial: 'hidden',
    whileInView: 'shown',
    viewport: { once: true, margin: '0px 0px -6% 0px' },
    transition: { ...ENTER_SPRING, delay: Math.min(index, ENTER_MAX_STEPS) * ENTER_STEP_S },
  };
  const tags = project.tags || [];
  const team = project.team || [];
  const href = `/projeler/${project.slug}`;
  // Liste verisi detay sayfasına taşınır: detay yükleme ekranı beklemeden açılır.
  const link = { to: href, state: { project } };

  if (variant !== 'default') {
    const featured = variant === 'featured';
    return (
      <MotionLink
        {...link}
        {...enter}
        className={`group relative block overflow-hidden rounded-3xl border border-white/10 bg-[#1a2333] hover:border-macs-accent/50 transition-colors ${
          featured
            ? 'sm:col-span-2 xl:row-span-2 min-h-[380px]'
            : 'sm:col-span-2 min-h-[260px]'
        }`}
      >
        <img
          src={project.imageUrl}
          alt=""
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
          onError={handleImageError}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
        {featured && (
          <span className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-black/60 px-4 py-1.5 text-sm font-bold text-yellow-300">
            <Sparkles size={14} fill="currentColor" aria-hidden="true" />
            ÖNE ÇIKAN
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <h3 className={`font-bold text-white mb-2 ${featured ? 'text-3xl md:text-4xl' : 'text-2xl'}`}>{project.title}</h3>
          <p className={`text-gray-300 max-w-2xl mb-4 ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>{project.shortDescription}</p>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, MAX_TAGS + 1).map((tag) => (
              <span key={tag} className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-xs text-white">{tag}</span>
            ))}
          </div>
        </div>
      </MotionLink>
    );
  }

  return (
    <MotionLink
      {...link}
      {...enter}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#1a2333] hover:border-macs-accent/40 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_400px]"
    >
      <div className="relative h-48 shrink-0 overflow-hidden">
        <img
          src={project.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2333] to-transparent opacity-60" />
        <span className="absolute top-4 left-4 rounded-full border border-macs-accent/30 bg-black/55 px-3 py-1 text-xs font-semibold text-macs-accent-300">
          {project.category}
        </span>
      </div>

      <div className="flex flex-grow flex-col p-6">
        <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-macs-accent">{project.title}</h3>
        <p className="mb-4 flex-grow text-sm text-gray-400 line-clamp-2">{project.shortDescription}</p>

        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <span key={tag} className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-xs text-gray-400">{tag}</span>
            ))}
            {tags.length > MAX_TAGS && (
              <span className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-xs text-gray-400">+{tags.length - MAX_TAGS}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex -space-x-2" aria-label={team.length ? `${team.length} ekip üyesi` : undefined}>
            {team.slice(0, MAX_AVATARS).map((member) => (
              <span
                key={member.id}
                title={member.name}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1a2333] bg-white/10 text-[11px] font-semibold text-gray-200"
              >
                {initialsOf(member.name)}
              </span>
            ))}
            {team.length > MAX_AVATARS && (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1a2333] bg-white/5 text-[11px] text-gray-400">
                +{team.length - MAX_AVATARS}
              </span>
            )}
          </div>
          <span className="rounded-full bg-white/5 p-2 text-white transition-colors group-hover:bg-macs-accent-500" aria-hidden="true">
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </MotionLink>
  );
};

ProjectCard.propTypes = {
  variant: PropTypes.oneOf(['default', 'wide', 'featured']),
  index: PropTypes.number,
  project: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    slug: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    shortDescription: PropTypes.string,
    imageUrl: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    team: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
    })),
  }).isRequired,
};

export default ProjectCard;
