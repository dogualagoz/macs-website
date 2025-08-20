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

  // // Saatleri formatla
  // const formatTime = (time) => {
  //   return new Date(time).toLocaleTimeString('tr-TR', {
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  // Resim URL'ini kontrol et
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '/assets/images/img_innovation.png';
    if (imageUrl.startsWith('http')) return imageUrl;
    return process.env.PUBLIC_URL + imageUrl;
  };

  const Description = {
  aciklama: 
  `Topluluğumuzun düzenlediği bu etkinlikte bir araya geliyoruz!  
  Yeni insanlarla tanışacak, birlikte keyifli vakit geçirecek  
  ve farklı aktivitelerle günümüzü renklendireceğiz.  
  Sen de bu güzel deneyimin parçası olmayı unutma!`
};

  const maxChars = 33;
  const shortLocation =
  location.length > maxChars
    ? location.slice(0, maxChars) + "..."
    : location;

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
              {shortLocation}
            </span>
            </div>
          <div className='Card-Title'>
            <span>{title}</span>
            </div>
          <div className='Card-Description'>
            <span>
              {Description.aciklama}
            </span>
            </div>
          <div className='Card-Details'>
            <button>
              <span>Hepsini Gör</span>
              <img src="../../assets/images/img_right.png" alt="" />
            </button>
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