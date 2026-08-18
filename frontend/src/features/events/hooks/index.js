import { useState, useEffect, useMemo, useCallback } from 'react';
import { eventService } from '../../../shared/services/api';
import { mockEvents, mockEventCategories } from '../data/mockEvents';
import { USE_MOCK_FALLBACK } from '../../../shared/utils/mockFallback';

/**
 * Custom hook for fetching and managing events data
 * Handles loading states, errors, and API calls
 */
export const useEventsData = () => {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEventsData = useCallback(async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      const [eventsData, categoriesData] = await Promise.all([
        eventService.getAll(),
        eventService.getCategories()
      ]);

      // Boş liste geçerli bir yanıt: "henüz etkinlik yok" demek, hata değil.
      setEvents(eventsData || []);
      setCategories(categoriesData || []);
      setError(null);
    } catch (err) {
      console.error('Etkinlikler yüklenemedi:', err);

      if (USE_MOCK_FALLBACK) {
        setEvents(mockEvents.map(eventService._mapEvent));
        setCategories(mockEventCategories);
        setError(null);
      } else {
        setEvents([]);
        setCategories([]);
        setError('Etkinlikler yüklenemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(400 - elapsedTime, 0);

      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  }, []);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  const retry = useCallback(() => {
    loadEventsData();
  }, [loadEventsData]);

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
