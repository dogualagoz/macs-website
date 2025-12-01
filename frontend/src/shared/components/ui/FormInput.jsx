import React from 'react';
import PropTypes from 'prop-types';

export const FormInput = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  required = false,
  ...props 
}) => {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        className="form-input"
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      />
    </div>
  );
};

FormInput.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};
