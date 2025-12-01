/**
 * Date formatting utilities
 * Provides consistent date and time formatting across the application
 */

const TIMEZONE = 'Europe/Istanbul';
const LOCALE = 'tr-TR';

/**
 * Format a date string to Turkish long date format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date (e.g., "25 Ocak 2024")
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' 
      ? new Date(date.includes('Z') ? date : date + 'Z') 
      : date;
    
    return new Intl.DateTimeFormat(LOCALE, { 
      dateStyle: 'long',
      timeZone: TIMEZONE 
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a time string to Turkish time format (HH:MM)
 * @param {string|Date} time - Time string or Date object
 * @returns {string} Formatted time (e.g., "14:30")
 */
export const formatTime = (time) => {
  if (!time) return '';
  
  try {
    const dateObj = typeof time === 'string' 
      ? new Date(time.includes('Z') ? time : time + 'Z') 
      : time;
    
    return dateObj.toLocaleTimeString(LOCALE, { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: TIMEZONE 
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Format a date string to short date format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date (e.g., "25.01.2024")
 */
export const formatShortDate = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(LOCALE, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: TIMEZONE
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting short date:', error);
    return '';
  }
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date string or Date object
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  } catch (error) {
    console.error('Error checking past date:', error);
    return false;
  }
};

/**
 * Sort events by start time
 * @param {Array} events - Array of event objects with start_time
 * @returns {Array} Sorted events array
 */
export const sortEventsByDate = (events) => {
  if (!Array.isArray(events)) return [];
  
  return [...events].sort((a, b) => 
    new Date(a.start_time) - new Date(b.start_time)
  );
};

/**
 * Get relative time from now (e.g., "2 days ago", "in 3 hours")
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = dateObj - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Yarın';
    if (diffDays === -1) return 'Dün';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} gün sonra`;
    if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} gün önce`;
    
    return formatDate(dateObj);
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
};
