import React from 'react';

/**
 * Error Message Component
 * Reusable error display with retry functionality
 */
export default function ErrorMessage({ 
  message = 'Bir hata oluştu', 
  onRetry,
  icon = '⚠️'
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <p className="text-gray-700 mb-4 text-lg">{message}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-[#07132b] text-white rounded-lg hover:bg-[#07132b]/90 transition"
          >
            Tekrar Dene
          </button>
        )}
      </div>
    </div>
  );
}
