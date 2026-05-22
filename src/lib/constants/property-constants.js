/* ═══════════════════════════════════════════════════════════════
   PROPERTY CONSTANTS — Single source of truth for all property
   type definitions, mappings, and RECONNECT normalization.
   ═══════════════════════════════════════════════════════════════ */

// ── Hub PROPERTY_TYPES — keyed by property_type_id ──────────
export const PROPERTY_TYPES = {
  1:  { es: 'Casa', en: 'House', icon: '🏠', color: 'from-blue-400 to-blue-600', markerColor: '#3B82F6' },
  2:  { es: 'Apartamento', en: 'Apartment', icon: '🏢', color: 'from-indigo-400 to-indigo-600', markerColor: '#6366F1' },
  3:  { es: 'Lote', en: 'Lot', icon: '📐', color: 'from-emerald-400 to-emerald-600', markerColor: '#10B981' },
  4:  { es: 'Zona Rural', en: 'Rural Area', icon: '🌿', color: 'from-orange-400 to-orange-600', markerColor: '#F97316' },
  5:  { es: 'Comercial', en: 'Commercial', icon: '🏪', color: 'from-red-400 to-red-600', markerColor: '#EF4444' },
  6:  { es: 'Bodega', en: 'Warehouse', icon: '📦', color: 'from-gray-400 to-gray-500', markerColor: '#6B7280' },
  7:  { es: 'Oficina', en: 'Office', icon: '🏛️', color: 'from-cyan-400 to-cyan-600', markerColor: '#06B6D4' },
  8:  { es: 'Hotel', en: 'Hotel', icon: '🏨', color: 'from-amber-400 to-amber-600', markerColor: '#F59E0B' },
  9:  { es: 'Multifamiliar', en: 'Multi-family', icon: '🏘️', color: 'from-violet-400 to-violet-600', markerColor: '#8B5CF6' },
  10: { es: 'Terreno', en: 'Land', icon: '🗺️', color: 'from-lime-400 to-lime-600', markerColor: '#84CC16' },
};

// ── PROPERTY_TYPES as array (for <select> dropdowns) ────────
export const PROPERTY_TYPES_LIST = Object.entries(PROPERTY_TYPES).map(([id, info]) => ({
  id: Number(id), ...info,
}));

// ── RECONNECT feed string → Hub property_type_id ────────────
export const TYPE_NAME_TO_ID = {
  'casa/villa': 1,
  'casa': 1,
  'villa': 1,
  'apartamento': 2,
  'condominio': 2,
  'lote/terreno': 3,
  'lote/terreno ': 3,   // trailing space variant from feed
  'lote': 3,
  'terreno': 3,
  'finca': 4,
  'zona rural': 4,
  'farm': 4,
  'comercial': 5,
  'negocio': 5,
  'bodega': 6,
  'oficina': 7,
  'hotel': 8,
  'edificio': 9,
  'multifamiliar': 9,
  'land': 10,
};

// ── RECONNECT numeric type_id → Hub search string ───────────
// Used by buyer-search matching (check-alerts, searches/matches)
export const RECONNECT_TYPE_MAP = {
  1:  'Casa',
  2:  'Apartamento',
  3:  'Lote',
  4:  'Zona Rural',
  5:  'Comercial',
  6:  'Comercial',   // Bodega → Comercial for search matching
  7:  'Comercial',   // Oficina → Comercial for search matching
  10: 'Lote',        // Terreno → Lote for search matching
};

// ── Resolve a RECONNECT feed item → Hub property_type_id ────
export function resolveTypeId(feedItem) {
  const directId = feedItem.PropertyTypeId || feedItem.PropertyTypeId_ || feedItem.propertyTypeId;
  if (directId && directId > 0) return directId;

  const name = (feedItem.PropertyTypeName_es || feedItem.PropertyTypeName_en || '').trim().toLowerCase();
  return TYPE_NAME_TO_ID[name] || null;
}

// ── Given a property_type_id, return canonical Hub name (ES) ─
export function canonicalTypeName(typeId) {
  return PROPERTY_TYPES[typeId]?.es || null;
}
