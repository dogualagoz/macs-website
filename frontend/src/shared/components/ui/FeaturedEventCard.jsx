/**
 * FeaturedEventCard Component
 * 
 * Displays a featured event card with larger size and prominent styling.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';

const FeaturedEventCard = ({ title, date, location, description, image, startTime, endTime, maxParticipants, slug }) => {
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (time) => {
    return new Date(time + 'Z').toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul'
    });
  };

  const isPast = new Date(endTime || startTime) < new Date();

  const styles = {
    card: {
      display: 'block',
      border: '1px solid #E1E1E1',
      borderRadius: '12px',
      backgroundColor: '#F9FAFB',
      overflow: 'hidden',
      textDecoration: 'none',
      color: 'inherit',
    },
    image: {
      width: '100%',
      height: '200px',
      objectFit: 'cover',
      display: 'block',
      filter: isPast ? 'grayscale(100%)' : 'none',
    },
    content: {
      padding: '16px',
    },
    badges: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
      flexWrap: 'wrap',
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: isPast ? '#FEE2E2' : '#DBEAFE',
      color: isPast ? '#DC2626' : '#1E40AF',
    },
    dateBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '14px',
      color: '#515151',
      fontWeight: '500',
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#000',
      marginBottom: '8px',
      lineHeight: '1.3',
    },
    description: {
      fontSize: '14px',
      color: '#585454',
      marginBottom: '16px',
      lineHeight: '1.5',
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#515151',
      marginBottom: '8px',
    },
    icon: {
      width: '16px',
      height: '16px',
      color: '#07132b',
    },
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#07132b',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '16px',
    },
  };

  return (
    <Link to={`/etkinlikler/${slug || ''}`} style={styles.card}>
      <img 
        src={getImageUrl(image)} 
        alt={title}
        onError={handleImageError}
        style={styles.image}
      />
      <div style={styles.content}>
        <div style={styles.badges}>
          <span style={styles.statusBadge}>
            {isPast ? "Geçmiş" : "Öne Çıkan"}
          </span>
          <span style={styles.dateBadge}>
            <Calendar style={styles.icon} />
            {formatDate(date)}
          </span>
        </div>
        
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>
        
        <div style={styles.infoRow}>
          <Clock style={styles.icon} />
          <span>{formatTime(startTime)}</span>
        </div>
        
        <div style={styles.infoRow}>
          <MapPin style={styles.icon} />
          <span>{location}</span>
        </div>
        
        <div style={styles.infoRow}>
          <Users style={styles.icon} />
          <span>{maxParticipants || 100} Katılımcı</span>
        </div>
        
        {!isPast && (
          <button style={styles.button}>Kayıt Ol</button>
        )}
      </div>
    </Link>
  );
};

FeaturedEventCard.propTypes = {
  title: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  location: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  image: PropTypes.string,
  startTime: PropTypes.string,
  endTime: PropTypes.string,
  maxParticipants: PropTypes.number,
  slug: PropTypes.string
};

export default FeaturedEventCard; 