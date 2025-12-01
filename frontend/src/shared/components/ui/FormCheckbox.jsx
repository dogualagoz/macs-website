import React from 'react';
import PropTypes from 'prop-types';

export const FormCheckbox = ({ 
  id,
  label, 
  checked, 
  onChange,
  ...props 
}) => {
  return (
    <div className="checkbox-group">
      <input 
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
};

FormCheckbox.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
