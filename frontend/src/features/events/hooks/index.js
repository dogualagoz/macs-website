import { useState, useEffect, useMemo } from 'react';
import { eventService } from '../../../shared/services/api';

/**
 * Custom hook for fetching and managing events data
 * Handles loading states, errors, and API calls
 */
export const useEventsData = () => {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEventsData = async () => {
      try {
        setLoading(true);
        const [eventsData, categoriesData] = await Promise.all([
          eventService.getAll(),
          eventService.getCategories()
        ]);
        setEvents(eventsData || []);
        setCategories(categoriesData || []);
        setError(null);
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadEventsData();
  }, []);

  const retry = () => {
    window.location.reload();
  };

  return {
    events,
    categories,
    loading,
    error,
    retry
  };
};

/**
 * Custom hook for filtering and sorting events
 * Handles category filtering and featured event selection
 */
export const useEventFilters = (events) => {
  const [activeFilter, setActiveFilter] = useState(null);

  // Filter and sort events by start time
  const filteredAndSorted = useMemo(() => {
    const filteredList = activeFilter
      ? events.filter(event => event.category_id === activeFilter)
      : events.slice();
    
    return filteredList.sort((a, b) => 
      new Date(a.start_time) - new Date(b.start_time)
    );
  }, [events, activeFilter]);

  // Get featured event (first featured or first in list)
  const featuredEvent = useMemo(() => {
    return events.find(event => event.is_featured) || events[0];
  }, [events]);

  return {
    activeFilter,
    setActiveFilter,
    filteredAndSorted,
    featuredEvent
  };
};
