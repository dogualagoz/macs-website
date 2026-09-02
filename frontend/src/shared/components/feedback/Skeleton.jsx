/**
 * Skeleton loaders
 *
 * Sayfa düzeninin (layout) iskeletini birebir taklit eder; spinner gibi
 * ortalanan tek bir blok yerine içerik gelecek alanı rezerve eder.
 * CLS'yi ve "site boş" algısını önler.
 */
import React from 'react';
import '../../../styles/components/skeleton.css';

export const Skeleton = ({ className = '', style }) => (
  <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
);

export function EventCardSkeleton({ dark = false }) {
  return (
    <div className={`skeleton-card ${dark ? 'skeleton-card--dark' : ''}`}>
      <Skeleton className="skeleton-card__media" />
      <div className="skeleton-card__body">
        <Skeleton className="skeleton-line skeleton-line--short" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line skeleton-line--med" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6, dark = false }) {
  return (
    <div className="skeleton-grid" role="status" aria-label="Etkinlikler yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} dark={dark} />
      ))}
      <span className="sr-only">Yükleniyor…</span>
    </div>
  );
}

export function FeaturedCardSkeleton({ dark = false }) {
  return (
    <div className={`skeleton-featured ${dark ? 'skeleton-card--dark' : ''}`}>
      <Skeleton className="skeleton-featured__media" />
      <div className="skeleton-featured__body">
        <Skeleton className="skeleton-line skeleton-line--short" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line skeleton-line--med" />
      </div>
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <section className="skeleton-band" aria-hidden="true">
      <div className="skeleton-band__inner">
        <Skeleton className="skeleton-line skeleton-line--title" />
        <Skeleton className="skeleton-line skeleton-line--med" />
      </div>
    </section>
  );
}

export function SponsorRowSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-stack" role="status" aria-label="Sponsorlar yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <Skeleton className="skeleton-avatar" />
          <div className="skeleton-row__text">
            <Skeleton className="skeleton-line skeleton-line--short" />
            <Skeleton className="skeleton-line skeleton-line--med" />
          </div>
        </div>
      ))}
    </div>
  );
}
