import React, { useId } from 'react';
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
  const fieldId = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={fieldId}>{label}</label>
      <textarea 
        id={fieldId}
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
