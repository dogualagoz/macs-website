import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import '../../styles/components/MoreEventCard.css';

const MoreEventCard = ({ title, date, location, description, image, startTime, endTime, maxParticipants, slug , style}) => {
  // Tarihi formatla
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Saatleri formatla
  const formatTime = (time) => {
    return new Date(time).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Resim URL'ini kontrol et
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/assets/images/img_innovation.png';
    if (imageUrl.startsWith('http')) return imageUrl;
    return process.env.PUBLIC_URL + imageUrl;
  };

    return (
    <Link to={`/etkinlikler/${slug || ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className='MoreEventCard' style={style}>
        <div className='Card-İmage'>
            <img src={getImageUrl(image)} alt= "boş" 
            onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/assets/images/img_innovation.png';
        }}/>
        </div>
          <div className='Card-Date'>
            <img src="../../assets/images/img_calender.png" alt="Tarih" />
            <span> 
              {formatDate(date)}
            </span>
          </div>
          <div className="Card-Location">
            <img src="../../assets/images/img_location.png" alt="location" />
            <span>
              {location}
            </span>
            </div>
          <div className='Card-Title'>
            <span>{title}</span>
            </div>
          <div className='Card-Description'>
            <span>
              {description}
            </span>
            </div>
          <div className='Card-Details'>
            <button>Hepsini Gör</button>
            <img src="../../assets/images/img_right.png" alt="" />
          </div>
      </div>
    </Link>
    )
}

MoreEventCard.propTypes = {
  title: PropTypes.string.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    location: PropTypes.string,
    description: PropTypes.string.isRequired,
    image: PropTypes.string,
    startTime: PropTypes.string,
    endTime: PropTypes.string,
    maxParticipants: PropTypes.number,
    slug: PropTypes.string.isRequired
};

export default MoreEventCard;