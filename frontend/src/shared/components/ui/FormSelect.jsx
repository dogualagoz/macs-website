import React, { useId } from 'react';
import PropTypes from 'prop-types';

export const FormSelect = ({ 
  label, 
  value, 
  onChange, 
  options = [],
  placeholder = "Seçin...",
  required = false,
  ...props 
}) => {
  const fieldId = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={fieldId}>{label}</label>
      <select id={fieldId}
        className="form-input"
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

FormSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};
