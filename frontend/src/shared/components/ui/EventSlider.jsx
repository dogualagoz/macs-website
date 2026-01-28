/**
 * EventSlider Component
 * 
 * Modern slider/carousel for displaying events with smooth animations.
 * Uses framer-motion for gesture support and transitions.
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Clock, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../../utils/imageUtils';
import '../../../styles/components/slider.css';

const EventSlider = ({ events = [] }) => {
    const allEvents = events;

    const [direction, setDirection] = useState(0);

    // Navigate to previous cards
    const handlePrev = () => {
        const container = document.querySelector('.slider-grid');
        if (container) {
            container.scrollBy({ left: -container.offsetWidth, behavior: 'smooth' });
        }
    };

    // Navigate to next cards
    const handleNext = () => {
        const container = document.querySelector('.slider-grid');
        if (container) {
            container.scrollBy({ left: container.offsetWidth, behavior: 'smooth' });
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        try {
            const dateObj = new Date(dateStr?.endsWith?.('Z') ? dateStr : dateStr + 'Z');
            if (isNaN(dateObj.getTime())) return 'Tarih Yok';
            return new Intl.DateTimeFormat('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(dateObj);
        } catch {
            return 'Tarih Yok';
        }
    };

    // Format time
    const formatTime = (startTime, endTime) => {
        try {
            const start = new Date(startTime);
            const end = endTime ? new Date(endTime) : null;
            const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            if (end) {
                const endStr = end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                return `${startStr} - ${endStr}`;
            }
            return startStr;
        } catch {
            return '';
        }
    };

    // Check if event is past
    const isPast = (event) => {
        const endDate = new Date(event.end_time || event.start_time || event.date);
        return endDate < new Date();
    };

    // Animation variants
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0
        })
    };

    if (allEvents.length === 0) {
        return <div className="slider-empty">Gösterilecek etkinlik yok.</div>;
    }

    return (
        <div className="slider-container event-slider">
            {/* Slider Viewport */}
            <div className="slider-viewport">
                <div className="slider-slide slider-slide-multi">
                    <div className="slider-grid slider-grid-scroll">
                        {allEvents.map((event) => {
                            const eventIsPast = isPast(event);
                            return (
                                <Link key={event.id || event.slug} to={`/etkinlikler/${event.slug || ''}`} className="slider-card-link">
                                    <div className={`slider-card slider-card-compact event-card-slide ${eventIsPast ? 'past' : ''}`}>
                                        {/* Image Section */}
                                        <div className="slider-card-image">
                                            <img
                                                src={getImageUrl(event.image_url || event.image)}
                                                alt={event.title}
                                                onError={handleImageError}
                                                style={eventIsPast ? { filter: 'grayscale(100%)' } : {}}
                                            />
                                            {eventIsPast && <div className="slider-card-overlay" />}
                                        </div>

                                        {/* Content Section */}
                                        <div className="slider-card-content">
                                            <h3 className="slider-card-title">{event.title}</h3>

                                            <p className="slider-card-description">
                                                {event.description}
                                            </p>

                                            {/* Event Details */}
                                            <div className="slider-card-details">
                                                <div className="slider-card-detail">
                                                    <Calendar className="detail-icon" />
                                                    <span>{formatDate(event.date || event.start_time)}</span>
                                                </div>

                                                <div className="slider-card-detail">
                                                    <MapPin className="detail-icon" />
                                                    <span>{event.location}</span>
                                                </div>

                                                {(event.start_time || event.startTime) && (
                                                    <div className="slider-card-detail">
                                                        <Clock className="detail-icon" />
                                                        <span>{formatTime(event.start_time || event.startTime, event.end_time || event.endTime)}</span>
                                                    </div>
                                                )}

                                                {/* Kapasite - Sabit değer */}
                                                <div className="slider-card-detail">
                                                    <Users className="detail-icon" />
                                                    <span>100 Katılımcı</span>
                                                </div>
                                            </div>

                                            {/* CTA Button */}
                                            <div className="slider-card-cta">
                                                <span className="slider-cta-button">Detayları Gör</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            {allEvents.length > 3 && (
                <>
                    <button
                        className="slider-nav slider-nav-prev"
                        onClick={handlePrev}
                        aria-label="Önceki etkinlik"
                    >
                        <ChevronLeft />
                    </button>
                    <button
                        className="slider-nav slider-nav-next"
                        onClick={handleNext}
                        aria-label="Sonraki etkinlik"
                    >
                        <ChevronRight />
                    </button>
                </>
            )}
        </div>
    );
};

EventSlider.propTypes = {
    events: PropTypes.array
};

export default EventSlider;
