"use client";

import Link from 'next/link';
import PropertyStatusBadge from './PropertyStatusBadge';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   PropertyCard — Reusable card for the property portfolio grid
   ═══════════════════════════════════════════════════════════════ */

// RECONNECT property type ID → human label mapping
const PROPERTY_TYPES = {
  1: { es: 'Casa', en: 'House' },
  2: { es: 'Apartamento', en: 'Apartment' },
  3: { es: 'Lote', en: 'Lot' },
  4: { es: 'Finca', en: 'Farm' },
  5: { es: 'Comercial', en: 'Commercial' },
  6: { es: 'Bodega', en: 'Warehouse' },
  7: { es: 'Oficina', en: 'Office' },
  8: { es: 'Hotel', en: 'Hotel' },
  9: { es: 'Edificio', en: 'Building' },
  10: { es: 'Terreno', en: 'Land' },
};

function formatPrice(price, currencyId) {
  if (!price) return '—';
  const currency = currencyId === 1 ? 'CRC' : 'USD';
  const symbol = currencyId === 1 ? '₡' : '$';
  return `${symbol}${Number(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function PropertyCard({ property, lang = 'es' }) {
  const title = lang === 'en'
    ? (property.listing_title_en || property.listing_title_es || property.name)
    : (property.listing_title_es || property.listing_title_en || property.name);

  const typeLabel = property.property_type_id
    ? (PROPERTY_TYPES[property.property_type_id]?.[lang] || property.property_type || 'Propiedad')
    : (property.property_type || 'Propiedad');

  const price = formatPrice(property.list_price, property.list_price_currency_id);
  const location = property.unparsed_address || '';
  const mainImage = property.main_image_url || null;
  const contractType = property.listing_contract_type === 2 ? (lang === 'en' ? 'Rent' : 'Alquiler') : (lang === 'en' ? 'Sale' : 'Venta');

  // Property details
  const details = [];
  if (property.bedrooms_total > 0) details.push(`${property.bedrooms_total} hab`);
  if (property.bathrooms_full > 0) details.push(`${property.bathrooms_full} baños`);
  if (property.lot_size_area) details.push(`${Number(property.lot_size_area).toLocaleString()} m²`);

  // Days on market
  const daysOnMarket = property.submitted_at
    ? Math.floor((Date.now() - new Date(property.submitted_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Link
      href={`/propiedades/${property.id}`}
      className="group glass-panel overflow-hidden rounded-2xl hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1 block"
    >
      {/* Image / Placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-border dark:to-dark-bg overflow-hidden">
        {mainImage ? (
          <Image src={mainImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" fill />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <PropertyStatusBadge status={property.status} lang={lang} />
        </div>

        {/* Contract type tag */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
            {contractType}
          </span>
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-3 px-4">
          <p className="text-white font-bold text-lg tracking-tight">{price}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Type badge */}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-500 dark:text-brand-400">
          {typeLabel}
        </span>

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1 group-hover:text-brand-500 transition-colors">
          {title}
        </h3>

        {/* Location */}
        {location && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location}
          </p>
        )}

        {/* Details row */}
        {details.length > 0 && (
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {details.map((d, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Owner info indicator (for broker review) */}
        {property.owner_name && (
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              👤 {property.owner_name}
            </p>
            {daysOnMarket !== null && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {daysOnMarket}d
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export { PROPERTY_TYPES, formatPrice };
