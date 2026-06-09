import Image from 'next/image';

export default function CarpetaPageProperty({ cfg, property, t }) {
  if (!property) {
    return (
      <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, width: '100%', position: 'absolute', top: 0 }} />
        <div style={{ textAlign: 'center', padding: 40, maxWidth: 450 }}>
          <span style={{ fontSize: 48 }}>🏡</span>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginTop: 16 }}>{t.p_specs_title || 'Especificaciones de Propiedad'}</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>
            {t.p_specs_not_linked || 'Selecciona una propiedad en el constructor lateral para mostrar su ficha técnica detallada.'}
          </p>
        </div>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, width: '100%', position: 'absolute', bottom: 0 }} />
      </div>
    );
  }

  // Format price beautifully
  const formattedPrice = property.list_price
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(property.list_price)
    : (t.p_specs_contact_agent || 'Consultar Precio');

  // Extract up to 3 images from property_images sorted by priority
  const images = property.property_images && Array.isArray(property.property_images)
    ? [...property.property_images].sort((a, b) => (a.priority || 0) - (b.priority || 0)).slice(0, 3)
    : [];

  const mainImageUrl = images[0]?.image_url || property.cover_background_url || '/assets/carpeta-cover-pz.png';

  // List of active amenities
  const amenityList = [
    { key: 'pool_private', label: t.p_specs_amenity_pool || 'Piscina Privada', icon: '🏊‍♂️' },
    { key: 'garage', label: t.p_specs_amenity_garage || 'Cochera / Garaje', icon: '🚗' },
    { key: 'gated_community', label: t.p_specs_amenity_gated || 'Comunidad Cerrada', icon: '🛡️' },
    { key: 'cooling', label: t.p_specs_amenity_ac || 'Aire Acondicionado', icon: '❄️' },
    { key: 'has_view', label: t.p_specs_amenity_view || 'Vista Panorámica', icon: '🏔️' },
    { key: 'maid_room', label: t.p_specs_amenity_maid || 'Cuarto de Servicio', icon: '🛏️' },
    { key: 'has_association', label: t.p_specs_amenity_hoa || 'Cuota de Asociación', icon: '🤝' },
  ];

  return (
    <div className="carpeta-page" style={{ padding: 0, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      {/* Top accent border */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '14px 44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <Image src={cfg.logo || '/assets/logo-altitud.png'} alt="REMAX Logo" style={{ height: 20, width: 'auto' }} width={100} height={20} unoptimized />
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {t.p_specs_header || 'ESPECIFICACIONES DE PROPIEDAD'}
        </span>
      </div>

      <div style={{ flex: 1, padding: '24px 44px 20px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Title and Price Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1, marginRight: 16 }}>
            <span style={{ fontSize: 9, color: '#DC1431', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              {t.p_specs_sub || 'FICHA TÉCNICA E INVENTARIO'}
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1.2 }}>
              {property.listing_title_es || property.name}
            </h2>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: 500 }}>
              📍 {property.unparsed_address || (property.contact_id ? 'Ubicación Asociada' : 'San Isidro, Costa Rica')}
            </p>
          </div>
          <div style={{ textAlign: 'right', shrink: 0 }}>
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {t.p_specs_price_label || 'PRECIO DE LISTA'}
            </span>
            <div style={{ fontSize: 26, fontWeight: 950, color: cfg.accent, letterSpacing: '-0.03em', marginTop: 2 }}>
              {formattedPrice}
            </div>
            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
              USD
            </span>
          </div>
        </div>

        {/* Two-Column Grid: General Details & Amenities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, marginBottom: 24 }}>
          
          {/* Left Column: Sizes and Registry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* National Registry */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 11, fontWeight: 900, color: '#1a1a2e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🇨🇷 {t.p_specs_registry || 'REGISTRO NACIONAL DE COSTA RICA'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, uppercase: true }}>{t.p_specs_finca || 'NÚMERO DE FINCA'}</span>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>
                    #{property.finca_number || 'N/D'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, uppercase: true }}>{t.p_specs_plano || 'PLANO CATASTRADO'}</span>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>
                    #{property.plano_number || 'N/D'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sizes & Areas */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: 11, fontWeight: 900, color: '#1a1a2e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                📏 {t.p_specs_sizes || 'DIMENSIONES Y SUPERFICIE'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>{t.p_specs_lot_size || 'ÁREA DE TERRENO'}</span>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>
                    {property.size_sqm || property.lot_size_area ? `${Number(property.size_sqm || property.lot_size_area).toLocaleString()} m²` : 'N/D'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>{t.p_specs_const_size || 'ÁREA DE CONSTRUCCIÓN'}</span>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e', marginTop: 2 }}>
                    {property.construction_size ? `${Number(property.construction_size).toLocaleString()} m²` : 'N/D'}
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
              <div style={{ background: '#f8fafc', padding: '12px 6px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 16 }}>🛏️</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', marginTop: 4 }}>{property.bedrooms_total || 0}</div>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t.p_specs_bedrooms || 'Habitaciones'}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 6px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 16 }}>🚿</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', marginTop: 4 }}>
                  {property.bathrooms_full || 0}
                  {property.bathrooms_half ? `.${property.bathrooms_half}` : ''}
                </div>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t.p_specs_bathrooms || 'Baños'}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px 6px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 16 }}>🚗</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a2e', marginTop: 4 }}>{property.garage_spaces || (property.garage ? 1 : 0)}</div>
                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{t.p_specs_garage || 'Garajes'}</span>
              </div>
            </div>

          </div>

          {/* Right Column: Amenities Checklist */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: 11, fontWeight: 900, color: '#1a1a2e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
              ✨ {t.p_specs_amenities || 'LISTA DE AMENIDADES'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
              {amenityList.map((amenity) => {
                const isActive = !!property[amenity.key];
                return (
                  <div key={amenity.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: isActive ? 1 : 0.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>{amenity.icon}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: isActive ? '#1a1a2e' : '#64748b' }}>
                        {amenity.label}
                      </span>
                    </div>
                    <div>
                      {isActive ? (
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justify: 'center' }}>
                          <svg style={{ width: 10, height: 10, color: '#137333' }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justify: 'center' }}>
                          <svg style={{ width: 8, height: 8, color: '#94a3b8' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Drive Photo Feed Gallery */}
        <div style={{ marginTop: 'auto' }}>
          <h4 style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            📸 {t.p_specs_gallery || 'GALERÍA DE FOTOS (GOOGLE DRIVE)'}
          </h4>
          
          {images.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {images.map((img, index) => (
                <div key={img.id || index} style={{ height: 100, borderRadius: 8, overflow: 'hidden', position: 'relative', border: '1px solid #cbd5e1' }}>
                  <img 
                    src={img.image_url} 
                    alt={`Property ${index + 1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                {t.p_specs_no_images || 'Fotos de Google Drive en proceso de sincronización...'}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Bottom accent border */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, #DC1431)`, flexShrink: 0, marginTop: 'auto' }} />
    </div>
  );
}
