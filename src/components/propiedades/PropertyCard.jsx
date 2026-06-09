/* eslint-disable */
"use client";

import { useState } from 'react';
import Link from 'next/link';
import PropertyStatusBadge from './PropertyStatusBadge';
import Image from 'next/image';
import PortfolioQualityMeter, { calculateQuality } from './PortfolioQualityMeter';
import { PROPERTY_TYPES } from '@/lib/constants/property-constants';

/* ═══════════════════════════════════════════════════════════════
   PropertyCard — Row layout with expandable details
   One property per row: Photo | Info | Quality | DOM | Arrow
   ═══════════════════════════════════════════════════════════════ */

const PORTAL_ICONS = {
  reconnect: { emoji: '🔗', label: 'RECONNECT' },
  encuentra24: { emoji: '🌐', label: 'Encuentra24' },
  chozi: { emoji: '🏠', label: 'Chozi' },
  listglobally: { emoji: '🌍', label: 'ListGlobally' },
};

function formatPrice(price, currencyId) {
  if (!price) return '—';
  const symbol = currencyId === 1 ? '₡' : '$';
  return `${symbol}${Number(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function PropertyCard({ property, lang = 'es', zonePriceMap = {} }) {
  const [expanded, setExpanded] = useState(false);

  const title = lang === 'en'
    ? (property.listing_title_en || property.listing_title_es || property.name)
    : (property.listing_title_es || property.listing_title_en || property.name);

  const typeLabel = property.property_type_id
    ? (PROPERTY_TYPES[property.property_type_id]?.[lang] || property.property_type || 'Propiedad')
    : (property.property_type || 'Propiedad');

  const price = formatPrice(property.list_price, property.list_price_currency_id);
  const location = property.unparsed_address || '';
  const mainImage = property.main_image_url || null;
  const contractType = property.listing_contract_type === 2
    ? (t('auto_rent'))
    : (t('auto_sale'));

  // Days on market
  const daysOnMarket = property.submitted_at
    ? Math.floor((Date.now() - new Date(property.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Quality
  const quality = calculateQuality(property);

  // Zone price comparison
  const zoneKey = property.property_type_id
    ? `${property.property_type_id}_${property.location_id || property.state_dep_prov_id || 'general'}`
    : null;
  const zoneData = zoneKey ? zonePriceMap[zoneKey] : null;
  let zoneDiffPct = null;
  let propertyPPM2 = null;
  if (zoneData && zoneData.count > 1 && property.list_price > 0 && property.lot_size_area > 0) {
    propertyPPM2 = Math.round(Number(property.list_price) / Number(property.lot_size_area));
    zoneDiffPct = ((propertyPPM2 - zoneData.avgPPM2) / zoneData.avgPPM2 * 100);
  }

  const portalLinks = property.portal_links || [];
  const inquiryCount = property.inquiry_count || 0;

  const getDomColor = (d) => {
    if (d === null) return 'text-gray-400';
    if (d > 180) return 'text-red-500';
    if (d > 90) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getQualityBg = (total) => {
    if (total >= 70) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50';
    if (total >= 40) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
  };

  const getQualityColor = (total) => {
    if (total >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (total >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* ── MAIN ROW ── */}
      <div className="flex items-stretch">
        {/* Square Photo */}
        <Link href={`/propiedades/${property.id}`} className="shrink-0 w-28 h-28 md:w-32 md:h-32 relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-border dark:to-dark-bg overflow-hidden group">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              fill
              sizes="128px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* Status overlay */}
          <div className="absolute top-2 left-2">
            <PropertyStatusBadge status={property.status} lang={lang} />
          </div>
        </Link>

        {/* Info section */}
        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
          <Link href={`/propiedades/${property.id}`} className="block">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 dark:text-brand-400">
                {typeLabel}
              </span>
              <span className="text-[10px] text-gray-400">•</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {contractType}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate hover:text-brand-500 transition-colors">
              {title}
            </h3>
            {location && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {location}
              </p>
            )}
          </Link>
          <p className="text-base font-black text-gray-900 dark:text-white mt-1">
            {price}
          </p>
        </div>

        {/* Quality square */}
        <div className={`hidden md:flex shrink-0 w-24 flex-col items-center justify-center border-l border-r border-gray-100 dark:border-dark-border px-2 ${getQualityBg(quality.total)}`}>
          <span className={`text-2xl font-black ${getQualityColor(quality.total)}`}>{quality.total}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {t('auto_quality')}
          </span>
          <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${quality.total >= 70 ? 'from-emerald-400 to-emerald-500' : quality.total >= 40 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'}`}
              style={{ width: `${quality.total}%` }}
            />
          </div>
        </div>

        {/* Days on Market */}
        <div className="hidden sm:flex shrink-0 w-20 flex-col items-center justify-center border-r border-gray-100 dark:border-dark-border px-2">
          <span className={`text-xl font-black ${getDomColor(daysOnMarket)}`}>
            {daysOnMarket !== null ? daysOnMarket : '—'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {t('auto_days_1')}
          </span>
        </div>

        {/* Expand arrow */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 w-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          aria-label="Expand details"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ── MOBILE quality + DOM row (visible on small screens) ── */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-dark-border">
        <div className={`flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${getQualityBg(quality.total)}`}>
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${quality.total >= 70 ? 'from-emerald-400 to-emerald-500' : quality.total >= 40 ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'}`}
              style={{ width: `${quality.total}%` }}
            />
          </div>
          <span className={`text-xs font-black ${getQualityColor(quality.total)}`}>{quality.total}%</span>
        </div>
        <div className="text-center px-2">
          <span className={`text-sm font-black ${getDomColor(daysOnMarket)}`}>{daysOnMarket ?? '—'}</span>
          <span className="text-[9px] text-gray-400 ml-1">días</span>
        </div>
      </div>

      {/* ── EXPANDED DETAILS ── */}
      <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-gray-100 dark:border-dark-border px-4 md:px-6 py-4 bg-slate-50/50 dark:bg-dark-bg/50 space-y-4">

          {/* Quality breakdown */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
              {t('auto_listing_quality_breakdown')}
            </h4>
            <PortfolioQualityMeter property={property} />
          </div>

          {/* Zone comparison + Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Zone price */}
            {zoneDiffPct !== null && (
              <div className="p-3 rounded-xl bg-white dark:bg-dark-panel border border-gray-100 dark:border-dark-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {t('auto_zone_avg_m²')}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    ${zoneData.avgPPM2.toLocaleString()}/m²
                  </p>
                  <span className="text-[10px] text-gray-400">vs ${propertyPPM2.toLocaleString()}/m²</span>
                </div>
                <p className={`text-xs font-black mt-0.5 ${zoneDiffPct > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {zoneDiffPct > 0 ? '↑' : '↓'} {zoneDiffPct > 0 ? '+' : ''}{zoneDiffPct.toFixed(1)}%
                  <span className="text-gray-400 font-normal ml-1">
                    {zoneDiffPct > 0 ? (t('auto_above_avg')) : (t('auto_below_avg'))}
                  </span>
                </p>
              </div>
            )}

            {/* Inquiries */}
            <div className="p-3 rounded-xl bg-white dark:bg-dark-panel border border-gray-100 dark:border-dark-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {t('auto_inquiries')}
              </p>
              <p className="text-lg font-black text-gray-700 dark:text-gray-300">{inquiryCount}</p>
            </div>

            {/* Photos */}
            <div className="p-3 rounded-xl bg-white dark:bg-dark-panel border border-gray-100 dark:border-dark-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {t('auto_photos_1')}
              </p>
              <p className="text-lg font-black text-gray-700 dark:text-gray-300">{property.image_count || 0}</p>
            </div>
          </div>

          {/* Portal links */}
          {portalLinks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                {t('auto_published_on_portals')}
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {portalLinks.map((link, i) => {
                  const info = PORTAL_ICONS[link.name] || { emoji: '🌐', label: link.name };
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-dark-panel border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                      {info.emoji} {info.label}
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Owner info */}
          {property.owner_name && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-dark-border text-xs text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{property.owner_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { PROPERTY_TYPES, formatPrice };
