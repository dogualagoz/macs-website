import React from 'react';
import { motion } from 'framer-motion';
import { useEventsData, useEventFilters } from '../hooks';
import FeaturedEventCard from '../components/FeaturedEventCard';
import EventCard from '../components/EventCard';
import Loading from '../../../shared/components/feedback/Loading';
import ErrorMessage from '../../../shared/components/feedback/ErrorMessage';

export default function Events() {
  // Custom hooks for data fetching and filtering
  const { events, categories, loading, error, retry } = useEventsData();
  const { activeFilter, setActiveFilter, filteredAndSorted, featuredEvent } = useEventFilters(events);

  // Loading and error states
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={retry} />;


  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#07132b] to-[#0a1a3a] text-white py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-7xl px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Etkinlikler</h1>
          <p className="text-lg text-white/80 max-w-2xl">
            Matematik ve bilgisayar bilimleri alanında düzenlediğimiz etkinlikler, workshoplar ve seminerler
          </p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Category Filters */}
        <CategoryFilters 
          categories={categories}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Featured Event */}
        {featuredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16"
          >
            <FeaturedEventCard event={featuredEvent} />
          </motion.div>
        )}

        {/* Events Grid */}
        <EventsGrid 
          events={filteredAndSorted}
          featuredEventId={featuredEvent?.id}
        />

        {/* Empty State */}
        {filteredAndSorted.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

// Category Filters Component
function CategoryFilters({ categories, activeFilter, onFilterChange }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mb-12"
    >
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => onFilterChange(null)}
          className={`px-6 py-2.5 rounded-full font-medium transition-all ${
            !activeFilter
              ? 'bg-[#07132b] text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tümü
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onFilterChange(category.id)}
            className={`px-6 py-2.5 rounded-full font-medium transition-all ${
              activeFilter === category.id
                ? 'bg-[#07132b] text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// Events Grid Component
function EventsGrid({ events, featuredEventId }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events
        .filter(event => event.id !== featuredEventId)
        .map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <EventCard event={event} />
          </motion.div>
        ))}
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20"
    >
      <p className="text-gray-500 text-lg">Bu kategoride etkinlik bulunamadı.</p>
    </motion.div>
  );
}
