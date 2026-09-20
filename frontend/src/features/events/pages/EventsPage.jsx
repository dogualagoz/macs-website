import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEventsData, useEventFilters } from '../hooks';
import FeaturedEventCard from '../components/FeaturedEventCard';
import EventCard from '../components/EventCard';
import { PageHeaderSkeleton, EventGridSkeleton } from '../../../shared/components/feedback/Skeleton';
import ErrorMessage from '../../../shared/components/feedback/ErrorMessage';
import SEO from '../../../shared/components/seo/SEO';

export default function Events() {
  // Custom hooks for data fetching and filtering
  const { events, categories, loading, error, retry } = useEventsData();
  const { activeFilter, setActiveFilter, filteredAndSorted, featuredEvent } = useEventFilters(events);

  // Loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <PageHeaderSkeleton />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <EventGridSkeleton count={6} />
        </div>
      </div>
    );
  }
  if (error) return <ErrorMessage message={error} onRetry={retry} />;


  return (
    <>
      <SEO 
        title="Etkinlikler"
        description="MACS topluluğunun düzenlediği yazılım atölyeleri, seminerler, hackathonlar ve networking etkinlikleri. Öğrenmeye ve gelişmeye hazır mısın?"
        keywords="MACS etkinlikleri, yazılım atölyesi, hackathon, seminer, ESOGÜ etkinlik"
        url="https://macsclub.com.tr/etkinlikler"
      />
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
    </>
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
  const now = new Date();
  const isPastEvent = (event) =>
    new Date(event.end_time || event.start_time) < now;

  const visible = events.filter((event) => event.id !== featuredEventId);
  const upcoming = visible.filter((event) => !isPastEvent(event));
  const past = visible.filter(isPastEvent);

  // Gecmisi aya gore grupla (timeline arsivi icin)
  const months = new Map();
  past.forEach((event) => {
    const d = new Date(event.end_time || event.start_time);
    const key = isNaN(d)
      ? 'Tarihsiz'
      : new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(d);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(event);
  });

  return (
    <>
      {upcoming.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.06 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="mt-16" aria-label="Etkinlik arşivi">
          <h2 className="text-2xl font-bold text-[#07132b] mb-8">Etkinlik Arşivi</h2>
          <ol className="relative ml-1.5 border-l-2 border-gray-200">
            {[...months.entries()].map(([label, items]) => (
              <li key={label} className="relative mb-10 pl-8 last:mb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#07132b] ring-4 ring-white"
                />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
                  {label}
                </h3>
                <ul className="space-y-1">
                  {items.map((event) => {
                    const d = new Date(event.end_time || event.start_time);
                    return (
                      <li key={event.id}>
                        <Link
                          to={`/etkinlikler/${event.slug}`}
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 rounded-lg px-3 py-2 -mx-3 hover:bg-gray-50 transition-colors"
                        >
                          <time
                            className="font-mono text-sm text-gray-500 w-20 shrink-0"
                            dateTime={isNaN(d) ? undefined : d.toISOString()}
                          >
                            {isNaN(d) ? '—' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`}
                          </time>
                          <span className="font-medium text-[#07132b]">{event.title}</span>
                          <span className="text-sm text-gray-500 sm:ml-auto">
                            {event.location}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
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
