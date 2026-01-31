import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Ensures page starts at top on route change,
 * and handles smooth scrolling for hash links.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // 1. Reset scroll to top immediately and with multiple delays
    // This handles cases where content loads asynchronously or animations delay layout
    const forceScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    forceScrollTop();
    const t1 = setTimeout(forceScrollTop, 10);
    const t2 = setTimeout(forceScrollTop, 100);
    const t3 = setTimeout(forceScrollTop, 300);

    // 2. Hash exists? Handle smooth scroll to section.
    if (hash) {
      const scrollToHash = () => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        
        if (element) {
          const headerHeight = 85; 
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

          // Clear the scroll top timeouts if we found our hash
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          return true;
        }
        return false;
      };

      let attempts = 0;
      const intervalId = setInterval(() => {
        attempts++;
        if (scrollToHash() || attempts > 25) {
          clearInterval(intervalId);
        }
      }, 100);

      return () => {
        clearInterval(intervalId);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
