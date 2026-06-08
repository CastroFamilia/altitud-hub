"use client";

import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   PortfolioQualityMeter — Professional RE Copywriting Standards
   Based on the "Real Estate Copywriter Pro" quality matrix:
   - Title: Subtype + Location + Differentiator (SEO formula)
   - Description: Hook + Body + Ficha Técnica + Benefits + CTA
   - Bilingual: ES + EN completeness
   - Photos: Quantity & quality
   - Video: Presence
   ═══════════════════════════════════════════════════════════════ */

const makeSafeT = (t) => {
  if (typeof t === 'function') return t;
  return (key) => {
    const dict = {
      auto_missing: 'Pendiente',
      auto_too_short: 'Muy corto',
      auto_way_too_short_25: 'Muy corto (mínimo 25)',
      auto_add_property_type: 'Agregar tipo de propiedad',
      auto_add_location: 'Agregar ubicación',
      auto_add_differentiator_views_nature: 'Agregar diferenciador (vista, naturaleza)',
      auto_excellent: 'Excelente',
      auto_good: 'Aceptable',
      auto_basic: 'Básico',
      auto_poor: 'Pobre',
      auto_professional: 'Profesional',
      auto_decent: 'Aceptable',
      auto_needs_work: 'Necesita mejora',
      auto_words_aim_100: 'palabras (apuntar a 100)',
      auto_words_too_short: 'palabras (muy corto)',
      auto_words_needs_more: 'palabras (necesita más)',
      'auto_add_technical_specs_m²': 'Agregar ficha técnica (m², hab, baños)',
      auto_mention_benefits_value: 'Mencionar beneficios/valor',
      auto_add_emotional_cta: 'Agregar cierre emocional',
      auto_add_nearby_amenities: 'Agregar cercanías (escuelas, hospital...)',
    };
    return dict[key] || key;
  };
};

// ── Title Quality (follows RE matrix: Subtype + Location + Differentiator) ──
function scoreTitle(text, lang = 'es', safeT) {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: safeT('auto_missing'), color: 'red', tips: [] };
  }
  const textStr = text.trim();
  const tips = [];
  let score = 0;

  // Length check (good titles: 40-80 chars)
  if (textStr.length >= 40) score += 20;
  else if (textStr.length >= 25) { score += 10; tips.push(safeT('auto_too_short')); }
  else { tips.push(safeT('auto_way_too_short_25')); }

  // Has property subtype keyword (Casa, Lote, Finca, Apartamento, Local, Villa...)
  const subtypeRegex = /(casa|lote|finca|apartamento|villa|terreno|local|bodega|edificio|condominio|penthouse|town\s?house|house|lot|farm|land|condo|commercial)/i;
  if (subtypeRegex.test(textStr)) score += 25;
  else tips.push(safeT('auto_add_property_type'));

  // Has location reference
  const locationRegex = /[A-Z][a-záéíóúñ]{2,}/; // Capitalized place name
  const locationKeywords = /(playa|montaña|centro|ciudad|beach|mountain|downtown|near|cerca|en\s|in\s)/i;
  if (locationRegex.test(textStr) || locationKeywords.test(textStr)) score += 25;
  else tips.push(safeT('auto_add_location'));

  // Has differentiator / USP (views, nature, investment, oceanfront, etc.)
  const uspRegex = /(vista|view|ocean|mar|naturaleza|nature|inversión|investment|oportunidad|opportunity|lujo|luxury|exclusiv|premium|privad|gated|piscina|pool|condominio|seguridad|security|río|river|bosque|forest|montaña|mountain|playa|beach|panorám|sunset|amanecer|ha\b|hectárea)/i;
  if (uspRegex.test(textStr)) score += 30;
  else tips.push(safeT('auto_add_differentiator_views_nature'));

  // Score label
  const label = score >= 80 ? (safeT('auto_excellent'))
    : score >= 50 ? (safeT('auto_good'))
    : score >= 25 ? (safeT('auto_basic'))
    : (safeT('auto_poor'));
  const color = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';

  return { score, label, color, tips };
}

// ── Description Quality (Hook + Body + Ficha + Benefits + CTA) ──
function scoreDescription(text, lang = 'es', safeT) {
  if (!text || text.trim().length === 0) {
    return { score: 0, label: safeT('auto_missing'), color: 'red', tips: [] };
  }
  const textStr = text.trim();
  const wordCount = textStr.split(/\s+/).length;
  const tips = [];
  let score = 0;

  // Word count (target: 80-200 words)
  if (wordCount >= 100) score += 20;
  else if (wordCount >= 60) { score += 12; tips.push(`${wordCount} ${safeT('auto_words_aim_100')}`); }
  else if (wordCount >= 30) { score += 6; tips.push(`${wordCount} ${safeT('auto_words_too_short')}`); }
  else { tips.push(`${wordCount} ${safeT('auto_words_needs_more')}`); }

  // Has technical bullets (📍📐🏠🛏️🛁🚗 or m², ha, habitaciones, etc.)
  const techRegex = /(m²|m2|hectárea|ha\b|habitacion|bedroom|baño|bathroom|parqueo|parking|📍|📐|🏠|🛏|🛁|🚗|\d+\s*(hab|bed|bath|baño|park))/i;
  if (techRegex.test(textStr)) score += 20;
  else tips.push(safeT('auto_add_technical_specs_m²'));

  // Has benefits / value props
  const benefitRegex = /(financiamiento|financing|diseño|design|gratis|free|inversión|investment|rentabilidad|return|plusvalía|appreciation|valor agregado|value|exclusiv|premium|oportunidad|opportunity)/i;
  if (benefitRegex.test(textStr)) score += 20;
  else tips.push(safeT('auto_mention_benefits_value'));

  // Has emotional/CTA language (not generic)
  const ctaRegex = /(despierte|imagine|visualice|wake up|imagine|picture|discover|descubr|capitalice|capitalize|brind|provide|asegur|secure|no dej|don't miss|contact|llam|agenda|schedule|visite)/i;
  if (ctaRegex.test(textStr)) score += 20;
  else tips.push(safeT('auto_add_emotional_cta'));

  // Has location context (nearby amenities: school, hospital, airport, beach)
  const contextRegex = /(escuela|school|hospital|aeropuerto|airport|playa|beach|centro|downtown|supermercado|mall|universidad|university|km|minutos|minutes|cerca|near|distancia|distance)/i;
  if (contextRegex.test(textStr)) score += 20;
  else tips.push(safeT('auto_add_nearby_amenities'));

  const label = score >= 80 ? (safeT('auto_professional'))
    : score >= 50 ? (safeT('auto_decent'))
    : score >= 25 ? (safeT('auto_needs_work'))
    : (safeT('auto_poor'));
  const color = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';

  return { score, label, color, tips };
}

// ── Photos ──
function scorePhotos(count) {
  if (!count || count === 0) return { score: 0, label: 'Sin fotos', color: 'red', tips: ['Necesita fotos profesionales'] };
  if (count < 5) return { score: 25, label: `${count} fotos`, color: 'red', tips: ['Mínimo 5 fotos'] };
  if (count < 10) return { score: 50, label: `${count} fotos`, color: 'amber', tips: ['Ideal: 10-20 fotos'] };
  if (count < 15) return { score: 75, label: `${count} fotos`, color: 'amber', tips: [] };
  return { score: 100, label: `${count} fotos`, color: 'emerald', tips: [] };
}

// ── Video ──
function scoreVideo(hasVideo) {
  return hasVideo
    ? { score: 100, label: 'Con video', color: 'emerald', tips: [] }
    : { score: 0, label: 'Sin video', color: 'red', tips: ['Agregar video tour o drone'] };
}

export function calculateQuality(property, t) {
  const safeT = makeSafeT(t);
  const titleEs = scoreTitle(property.listing_title_es, 'es', safeT);
  const titleEn = scoreTitle(property.listing_title_en, 'en', safeT);
  const descEs = scoreDescription(property.public_remarks_es, 'es', safeT);
  const descEn = scoreDescription(property.public_remarks_en, 'en', safeT);
  const photos = scorePhotos(property.image_count);
  const video = scoreVideo(!!property.video_link);

  // Weighted: Title 20%, Description 30%, Photos 30%, Video 20%
  const titleAvg = Math.round((titleEs.score + titleEn.score) / 2);
  const descAvg = Math.round((descEs.score + descEn.score) / 2);
  const total = Math.round(titleAvg * 0.20 + descAvg * 0.30 + photos.score * 0.30 + video.score * 0.20);

  const factors = [
    { key: 'title_es', label: 'Título ES', ...titleEs, weight: 10 },
    { key: 'title_en', label: 'Title EN', ...titleEn, weight: 10 },
    { key: 'desc_es', label: 'Descripción ES', ...descEs, weight: 15 },
    { key: 'desc_en', label: 'Description EN', ...descEn, weight: 15 },
    { key: 'photos', label: 'Fotos', ...photos, weight: 30 },
    { key: 'video', label: 'Video', ...video, weight: 20 },
  ];

  return { total, factors };
}

export default function PortfolioQualityMeter({ property, compact = false }) {
  const { t } = useApp();
  const { total, factors } = calculateQuality(property, t);

  const getBarColor = (t) => {
    if (t >= 70) return 'from-emerald-400 to-emerald-500';
    if (t >= 40) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  const getTotalColor = (t) => {
    if (t >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (t >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  if (compact) {
    const bgColor = total >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
      : total >= 40 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40';
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${bgColor}`}>
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-dark-border overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${getBarColor(total)} transition-all`} style={{ width: `${total}%` }} />
        </div>
        <span className={`text-sm font-black ${getTotalColor(total)} min-w-[40px] text-right`}>{total}%</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Overall bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-dark-border overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${getBarColor(total)} transition-all duration-500`} style={{ width: `${total}%` }} />
        </div>
        <span className={`text-sm font-black ${getTotalColor(total)}`}>{total}%</span>
      </div>

      {/* Factor details */}
      <div className="space-y-2">
        {factors.map(f => {
          const dotColor = f.color === 'emerald' ? 'bg-emerald-400' : f.color === 'amber' ? 'bg-amber-400' : 'bg-red-400';
          const barColor = f.color === 'emerald' ? 'from-emerald-400 to-emerald-500' : f.color === 'amber' ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500';
          const textColor = f.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : f.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';

          return (
            <div key={f.key} className="group">
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <span className="text-gray-600 dark:text-gray-400 font-medium w-28 shrink-0">{f.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-dark-border overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${f.score}%` }} />
                </div>
                <span className={`font-bold ${textColor} w-10 text-right`}>{f.score}%</span>
                <span className={`text-[10px] ${textColor} font-semibold w-20 text-right hidden sm:block`}>{f.label ? f.label : ''}</span>
              </div>
              {/* Tips (improvement suggestions) */}
              {f.tips && f.tips.length > 0 && (
                <div className="ml-4 mt-0.5 flex flex-wrap gap-1">
                  {f.tips.map((tip, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400">
                      💡 {tip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
