"use client";

import Link from 'next/link';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   DevelopmentCard — Reusable card for development portfolio grid
   ═══════════════════════════════════════════════════════════════ */

const STATUS_STYLES = {
  draft:            { label_es: 'Borrador',   label_en: 'Draft',      bg: 'bg-gray-500/20 text-gray-400' },
  pending_approval: { label_es: 'Pendiente',  label_en: 'Pending',    bg: 'bg-amber-500/20 text-amber-400' },
  needs_changes:    { label_es: 'Cambios',    label_en: 'Changes',    bg: 'bg-red-500/20 text-red-400' },
  active:           { label_es: 'Activo',     label_en: 'Active',     bg: 'bg-green-500/20 text-green-400' },
  sold_out:         { label_es: 'Vendido',    label_en: 'Sold Out',   bg: 'bg-purple-500/20 text-purple-400' },
  archived:         { label_es: 'Archivado',  label_en: 'Archived',   bg: 'bg-slate-500/20 text-slate-400' },
};

function formatPriceRange(min, max) {
  if (!min && !max) return null;
  const fmt = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (min && max) return `${fmt(min)} — ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max)}`;
}

export default function DevelopmentCard({ development, lang = 'es' }) {
  const d = development;
  const tagline = lang === 'en' ? (d.tagline_en || d.tagline_es) : (d.tagline_es || d.tagline_en);
  const status = STATUS_STYLES[d.status] || STATUS_STYLES.draft;
  const priceRange = formatPriceRange(d.price_range_min, d.price_range_max);

  return (
    <Link
      href={`/propiedades/desarrollos/${d.id}`}
      className="group glass-panel overflow-hidden rounded-2xl hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1 block"
    >
      {/* Image / Placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-emerald-900/30 to-blue-900/30 dark:from-emerald-950/50 dark:to-blue-950/50 overflow-hidden">
        {d.og_image_url ? (
          <Image src={d.og_image_url} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" fill />
        ) : d.logo_url ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <Image src={d.logo_url} alt={d.name} className="max-h-full max-w-full object-contain opacity-80" fill />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-14 h-14 text-emerald-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${status.bg}`}>
            {lang === 'en' ? status.label_en : status.label_es}
          </span>
        </div>

        {/* Unit label tag */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
            {d.unit_label || 'Lotes'}
          </span>
        </div>

        {/* Price range overlay */}
        {priceRange && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-3 px-4">
            <p className="text-white font-bold text-sm tracking-tight">{priceRange}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Developer name */}
        {d.developer_name && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
            {d.developer_name}
          </span>
        )}

        {/* Name */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1 group-hover:text-brand-500 transition-colors">
          {d.name}
        </h3>

        {/* Tagline */}
        {tagline && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {tagline}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100 dark:border-dark-border text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            {d.total_units || 0} {lang === 'en' ? 'total' : 'total'}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            {d.available_units || 0} {lang === 'en' ? 'available' : 'disponibles'}
          </span>
          {Array.isArray(d.sections) && d.sections.length > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
              {d.sections.length} {lang === 'en' ? 'blocks' : 'bloques'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { STATUS_STYLES, formatPriceRange };
