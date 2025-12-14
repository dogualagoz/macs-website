import React from 'react';
import PropTypes from 'prop-types';

export const Alert = ({ 
  type = 'info', 
  message,
  onClose 
}) => {
  // Mesaj yoksa hiçbir şey render etme
  if (!message) {
    return null;
  }

  const alertStyles = {
    success: 'bg-green-100 text-green-800 border-green-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return (
    <div className={`alert ${alertStyles[type]} border rounded-lg p-4 mb-4 flex items-center justify-between`}>
      <span>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          className="ml-4 text-lg font-bold hover:opacity-70"
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
};

Alert.propTypes = {
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  message: PropTypes.string,
  onClose: PropTypes.func,
};
