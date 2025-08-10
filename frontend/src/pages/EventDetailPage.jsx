import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/pages/styles.css';

const containerStyle = {
  maxWidth: 1100,
  margin: '32px auto',
  padding: '0 20px'
};

const cardStyle = {
  display: 'grid',
  gridTemplateColumns: '330px 1fr',
  gap: 24,
  background: '#f9fafb',
  border: '1px solid #e1e1e1',
  borderRadius: 8,
  padding: 24
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function EventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`${API_URL}/events/by-slug/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Etkinlik bulunamadı');
        return await res.json();
      })
      .then((data) => {
        if (isMounted) setEvent(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Bir hata oluştu');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) return <div style={{ padding: 24 }}>Yükleniyor...</div>;
  if (error) return <div style={{ padding: 24 }}>Hata: {error}</div>;
  if (!event) return <div style={{ padding: 24 }}>Etkinlik bulunamadı.</div>;

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#444' }}>&larr; Ana sayfaya dön</Link>
      </div>
      <div style={cardStyle}>
        <div style={{ width: 330, height: 174, borderRadius: 8, overflow: 'hidden', background: '#9ca5b1' }}>
          {event.image_url && (
            <img src={event.image_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        <div>
          <div className="event-badge">Etkinlik</div>
          <div className="event-meta">
            <img src="/assets/images/img_calender.png" alt="tarih" />
            <span>{new Date(event.start_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1 className="event-title" style={{ marginTop: 8 }}>{event.title}</h1>
          <p className="event-description">{event.description}</p>
          <div className="event-details">
            <img src="/assets/images/img_clock.png" alt="saat" />
            <span>{new Date(event.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            {event.end_time ? ` - ${new Date(event.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </div>
          <div className="event-details">
            <img src="/assets/images/img_location.png" alt="konum" />
            <span>{event.location}</span>
          </div>
        </div>
      </div>
      {event.content && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ margin: 0, marginBottom: 8 }}>Etkinlik Açıklaması</h3>
          <div style={{ color: '#4b5563', lineHeight: 1.7 }}>{event.content}</div>
        </div>
      )}
    </div>
  );
}

