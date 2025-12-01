import React from 'react';
import '../../../styles/pages/events2.css';

/**
 * Loading Spinner Component
 * Reusable loading indicator for async operations
 */
export default function Loading({ message = 'Yükleniyor...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="spinner center">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="spinner-blade"></div>
          ))}
        </div>
        {message && (
          <p className="mt-4 text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}
