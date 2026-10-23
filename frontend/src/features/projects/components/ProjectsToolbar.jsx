import React from 'react';
import PropTypes from 'prop-types';
import { motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';

/**
 * Projeler sayfasının tek filtre çubuğu: tür sekmeleri, arama ve kategori çipleri.
 * Düz akışta: yapışkan çubuk ekranın dörtte birini kaplıyor ve altından içerik sızıyordu.
 */
const ProjectsToolbar = ({
  tabs, activeTab, onTabChange,
  categories, selectedCategory, onCategoryChange,
  searchQuery, onSearchChange, resultCount,
}) => {
  const reduced = useReducedMotion();

  return (
    <div className="border-b border-white/10 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Proje türü"
          className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onTabChange(id)}
                className={`relative flex shrink-0 cursor-pointer items-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="projects-tab-pill"
                    className="absolute inset-0 rounded-full bg-macs-accent-500 shadow-[0_0_20px_rgba(242,49,124,0.45)]"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:max-w-[18rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Proje ara"
            placeholder="Proje ara..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-4 text-white placeholder:text-gray-500 focus:border-macs-accent/50 focus:outline-none focus:ring-1 focus:ring-macs-accent/50"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div role="group" aria-label="Kategoriler" className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const selected = category === selectedCategory;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => onCategoryChange(category)}
                className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg border px-4 py-1.5 text-sm transition-colors ${
                  selected
                    ? 'border-macs-accent/40 bg-macs-accent-500/20 text-macs-accent-300'
                    : 'border-transparent bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category === 'All' ? 'Tümü' : category}
              </button>
            );
          })}
        </div>
        <p className="hidden shrink-0 text-sm text-gray-400 sm:block" aria-live="polite">{resultCount} proje</p>
      </div>
    </div>
  );
};

ProjectsToolbar.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
  })).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  resultCount: PropTypes.number.isRequired,
};

export default ProjectsToolbar;
