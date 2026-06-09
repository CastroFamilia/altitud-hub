"use client";

import { useApp } from '@/lib/context';

/**
 * PrelistingPrintForm
 * 
 * A printer-friendly version of the Pre-Listing interview form.
 * Mirrors the 3-step wizard (Owners, Property, Tech) in a single,
 * professional PDF-ready layout with REMAX branding.
 */
export default function PrelistingPrintForm() {
  const { t, lang } = useApp();
  const today = new Date().toLocaleDateString(t('auto_en_us'), {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lineStyle = {
    borderBottom: '1.5px solid #d1d5db',
    minHeight: '28px',
    display: 'flex',
    alignItems: 'flex-end',
    paddingBottom: '3px',
  };

  const sectionTitle = (text) => (
    <div style={{ borderBottom: '2px solid #003DA5', paddingBottom: '4px', marginBottom: '16px', marginTop: '28px' }}>
      <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{text}</h3>
    </div>
  );

  const fieldRow = (label, colSpan = 1) => (
    <div style={{ gridColumn: `span ${colSpan}`, marginBottom: '12px' }}>
      <label style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div style={lineStyle} />
    </div>
  );

  const radioRow = (label, options) => (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ fontSize: '9px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '14px', height: '14px', border: '1.5px solid #9ca3af', borderRadius: '3px', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: '#374151', fontWeight: 500 }}>{opt}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px 48px', fontFamily: "'Montserrat', sans-serif", color: '#1a1a2e', fontSize: '10px', lineHeight: 1.5 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', borderBottom: '3px solid #003DA5', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#003DA5', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            RE<span style={{ color: '#CC0000' }}>/</span>MAX <span style={{ fontWeight: 400 }}>Altitud</span>
          </h1>
          <p style={{ fontSize: '8px', color: '#6b7280', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('auto_pre_listing_interview')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('auto_date')}
          </p>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#374151' }}>{today}</p>
        </div>
      </div>

      {/* Agent / Office Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '4px', marginTop: '16px' }}>
        {fieldRow(t('auto_agent_name'))}
        {fieldRow(t('auto_office'))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 1 — OWNERS / CONTACT                            */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle(t('auto_1_contact_information'))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {fieldRow(t('pre_s1_owner_name'), 2)}
        {fieldRow(t('pre_s1_occupation'))}
        {fieldRow(t('pre_s1_phones'))}
        {fieldRow(t('pre_s1_emails'), 2)}
      </div>

      {/* Decision Structure */}
      {sectionTitle(t('auto_decision_structure'))}

      {radioRow(
        t('pre_s1_agree_q'),
        [t('pre_s1_agree_yes'), t('pre_s1_agree_no')]
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {fieldRow(t('pre_s1_others_q'), 2)}
        {fieldRow(t('pre_s1_notary_q'), 2)}
      </div>

      {/* Motivation & Urgency */}
      {sectionTitle(t('auto_motivation_urgency'))}

      {fieldRow(t('pre_s1_motive_q'), 1)}

      {radioRow(
        t('pre_s1_timeframe_q'),
        [t('pre_s1_time_1'), t('pre_s1_time_3'), t('pre_s1_time_6')]
      )}

      {fieldRow(t('pre_s1_plan_b_q'), 1)}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 2 — PROPERTY                                     */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle(t('auto_2_property_identification'))}

      {fieldRow(t('pre_s2_prop_name'), 1)}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        {fieldRow(t('pre_s2_finca'))}
        {fieldRow(t('pre_s2_plano'))}
      </div>

      {radioRow(
        t('auto_property_type'),
        [t('pre_s2_type_house'), t('pre_s2_type_condo'), t('pre_s2_type_land'), t('pre_s2_type_com'), t('pre_s2_type_farm')]
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* STEP 3 — TECHNICAL SHEET                              */}
      {/* ══════════════════════════════════════════════════════ */}
      {sectionTitle(t('auto_3_technical_sheet'))}

      <p style={{ fontSize: '8px', color: '#9ca3af', fontStyle: 'italic', marginBottom: '14px', marginTop: '-8px' }}>
        {lang === 'en' 
          ? 'Complete the fields that apply based on the property type selected above.'
          : 'Complete los campos que apliquen según el tipo de inmueble seleccionado arriba.'}
      </p>

      {/* Residential Fields */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {t('auto_residential_house_condo')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
          {fieldRow(t('pre_s3_m2_const'))}
          {fieldRow(t('pre_s3_m2_lot'))}
          {fieldRow(t('pre_s3_year'))}
          {fieldRow(t('pre_s3_beds'))}
          {fieldRow(t('pre_s3_baths'))}
          {fieldRow(t('pre_s3_parking'))}
        </div>
        {fieldRow(t('pre_s3_hoa'))}
      </div>

      {/* Land / Farm Fields */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {t('auto_land_farm')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
          {fieldRow(t('pre_s3_area_ha'))}
          {fieldRow(t('pre_s3_water'))}
          {fieldRow(t('pre_s3_power'))}
        </div>
      </div>

      {/* Commercial Fields */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
        <p style={{ fontSize: '8px', fontWeight: 800, color: '#003DA5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          {t('auto_commercial')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          {fieldRow(t('pre_s3_com_type'))}
          {fieldRow(t('pre_s3_m2_const'))}
        </div>
      </div>

      {/* Status */}
      {radioRow(
        t('pre_s3_status_title'),
        ['Draft', t('auto_presented'), 'Follow Up', t('auto_accepted'), t('auto_rejected')]
      )}

      {/* Notes */}
      {sectionTitle(t('auto_additional_notes'))}
      <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '80px', padding: '8px' }} />

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '2px solid #003DA5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '7px', color: '#9ca3af', fontWeight: 600 }}>
          REMAX Altitud — {t('auto_confidential')} — altitudhub.com
        </p>
        <p style={{ fontSize: '7px', color: '#9ca3af' }}>
          {t('auto_signature')}: __________________________
        </p>
      </div>
    </div>
  );
}
