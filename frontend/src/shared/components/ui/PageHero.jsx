import React from "react";
import { m, useReducedMotion } from "framer-motion";

/**
 * Ic sayfalarin ust bandi (Etkinlikler, Ekibimiz).
 *
 * Lacivert gradient, sola hizali h1 ve tek satirlik aciklama. Ana sayfa ve
 * Projeler kendi vitrin hero'larini kullanir; bu bilesen onlar icin degil.
 * Sabit header icin ustte 80px (pt-20) beyaz bosluk birakir; Etkinlikler
 * sayfasinin onceki duzeniyle ayni.
 */
export default function PageHero({ title, description }) {
  const reduce = useReducedMotion();

  return (
    <div className="pt-20">
      <section className="bg-gradient-to-br from-macs-navy-900 to-macs-navy-800 text-white">
        <m.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-container px-5 py-16 md:py-20"
        >
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{title}</h1>
          {description && (
            <p className="max-w-2xl text-lg text-white/80">{description}</p>
          )}
        </m.div>
      </section>
    </div>
  );
}
