import React from 'react';
import { motion } from 'framer-motion';
import '../../../styles/components/loader.css';

/**
 * Unified Loading Component
 * @param {Object} props
 * @param {string} props.message - Optional message to display
 * @param {'light' | 'dark'} props.variant - Theme variant
 * @param {boolean} props.fullscreen - Whether to take up the whole screen
 */
export default function Loading({ 
  message = 'Yükleniyor...', 
  variant = 'light',
  fullscreen = false,
  className = ''
}) {
  return (
    <div className={`loader-container loader-${variant} ${fullscreen ? 'fullscreen' : ''} ${className}`}>
      <div className="spinner">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="spinner-blade"></div>
        ))}
      </div>
      {message && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="loader-text"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
