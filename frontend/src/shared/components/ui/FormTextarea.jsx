import React from 'react';
import PropTypes from 'prop-types';

export const FormTextarea = ({ 
  label, 
  value, 
  onChange, 
  placeholder,
  rows = 4,
  required = false,
  ...props 
}) => {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea 
        rows={rows}
        placeholder={placeholder}
        className="form-textarea"
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      />
    </div>
  );
};

FormTextarea.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  required: PropTypes.bool,
};
