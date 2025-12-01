import { useState, useEffect } from 'react';
import { eventService, projectService } from '../services/contentService';
import { handleApiError } from '../../../shared/utils/errorHandler';

export const useCategories = (type) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        if (type === 'event') {
          const eventCategories = await eventService.getCategories();
          setCategories(eventCategories);
        } else if (type === 'project') {
          const projectCategories = await projectService.getCategories();
          setCategories(projectCategories);
        }
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    if (type) {
      fetchCategories();
    }
  }, [type]);

  return { categories, loading, error };
};
