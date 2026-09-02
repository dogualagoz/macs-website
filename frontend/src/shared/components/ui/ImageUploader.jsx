import React, { useId } from 'react';
import PropTypes from 'prop-types';

export const ImageUploader = ({ 
  label = "Görsel",
  preview,
  onChange,
  ...props 
}) => {
  const inputId = useId();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={inputId}>{label}</label>
      <input 
        id={inputId}
        type="file"
        className="form-input"
        accept="image/*"
        onChange={handleFileChange}
        {...props}
      />
      {preview && (
        <div className="image-preview">
          <img 
            src={preview} 
            alt="Önizleme" 
            style={{maxHeight: "200px", marginTop: "10px"}} 
          />
        </div>
      )}
    </div>
  );
};

ImageUploader.propTypes = {
  label: PropTypes.string,
  preview: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
