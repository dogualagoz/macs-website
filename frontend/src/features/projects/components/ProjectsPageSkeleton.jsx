import React from 'react';
import { showcasePose } from './ProjectShowcase';
import { Skeleton } from '../../../shared/components/feedback/Skeleton';
import '../../../styles/components/skeleton.css';
import '../../../styles/components/projects-skeleton.css';

/** Vitrindeki V'nin yerleşimi: ortada bir kart, iki yanda ikişer kart. */
const V_OFFSETS = [-2, -1, 0, 1, 2];
const TOOLBAR_TABS = 3;
const TOOLBAR_CHIPS = 5;
/** Mozaik: öne çıkan kutu + 7 kart. Dördüncü kart gerçek listedeki gibi geniş. */
const TILE_COUNT = 7;
const WIDE_INDEX = 3;

function ShowcaseSkeleton() {
  return (
    <section className="project-showcase projects-skeleton__showcase">
      <div className="projects-skeleton__title">
        <Skeleton className="projects-skeleton__title-bar" />
      </div>
      <div className="project-showcase__stage projects-skeleton__stage">
        {V_OFFSETS.map((offset) => {
          const { vars, zIndex } = showcasePose(offset);
          return (
            <div key={offset} className="project-showcase__card projects-skeleton__card" style={{ ...vars, zIndex }}>
              <Skeleton className="projects-skeleton__card-fill" />
              <div className="project-showcase__caption projects-skeleton__caption">
                <Skeleton className="skeleton-line projects-skeleton__caption-title" />
                {offset === 0 && (
                  <>
                    <Skeleton className="skeleton-line" />
                    <Skeleton className="skeleton-line skeleton-line--med" />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="projects-skeleton__nav">
        <Skeleton className="projects-skeleton__count" />
        <Skeleton className="projects-skeleton__progress" />
      </div>
    </section>
  );
}

function ToolbarSkeleton() {
  return (
    <div className="border-b border-white/10 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-full gap-1 self-start overflow-hidden rounded-full border border-white/10 bg-white/5 p-1">
          {Array.from({ length: TOOLBAR_TABS }).map((_, index) => (
            <Skeleton key={index} className="projects-skeleton__tab" />
          ))}
        </div>
        <Skeleton className="projects-skeleton__search" />
      </div>
      <div className="mt-4 flex gap-2 overflow-hidden pb-1">
        {Array.from({ length: TOOLBAR_CHIPS }).map((_, index) => (
          <Skeleton key={index} className="projects-skeleton__chip" />
        ))}
      </div>
    </div>
  );
}

function TileSkeleton({ variant }) {
  if (variant !== 'default') {
    const featured = variant === 'featured';
    return (
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/10 bg-[#1a2333] ${
          featured ? 'sm:col-span-2 xl:row-span-2 min-h-[380px]' : 'sm:col-span-2 min-h-[260px]'
        }`}
      >
        <Skeleton className="projects-skeleton__fill" />
        <div className="absolute inset-x-0 bottom-0 grid gap-3 p-6 sm:p-8">
          <Skeleton className="skeleton-line projects-skeleton__tile-title" />
          <Skeleton className="skeleton-line" style={{ maxWidth: '36rem' }} />
          <Skeleton className="skeleton-line skeleton-line--med" />
        </div>
      </div>
    );
  }

  return (
    <div className="projects-skeleton__tile flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#1a2333]">
      <Skeleton className="projects-skeleton__thumb" />
      <div className="flex flex-1 flex-col p-6">
        <Skeleton className="skeleton-line projects-skeleton__tile-title" />
        <div className="mt-3 grid gap-2">
          <Skeleton className="skeleton-line" />
          <Skeleton className="skeleton-line skeleton-line--med" />
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="projects-skeleton__tag" />
          <Skeleton className="projects-skeleton__tag" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
          <Skeleton className="projects-skeleton__avatar" />
          <Skeleton className="projects-skeleton__avatar" />
        </div>
      </div>
    </div>
  );
}

/**
 * Projeler sayfasının yükleme iskeleti: vitrin (başlık, V, sayaç), filtre
 * çubuğu ve mozaik, gerçek sayfayla aynı sınıf ve ölçülerle çizilir. Böylece
 * veri gelince yerleşim kaymaz.
 */
export default function ProjectsPageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="projects-skeleton">
      <span className="sr-only">Projeler yükleniyor…</span>
      <div aria-hidden="true">
        <ShowcaseSkeleton />
        <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 pb-16">
          <ToolbarSkeleton />
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 [grid-auto-flow:dense]">
            <TileSkeleton variant="featured" />
            {Array.from({ length: TILE_COUNT }).map((_, index) => (
              <TileSkeleton key={index} variant={index === WIDE_INDEX ? 'wide' : 'default'} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
