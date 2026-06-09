/* eslint-disable */
"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   PORTAL LINK MANAGER — Broker-Only Tool
   
   Allows broker/admin to register or update portal links
   for a property after manually uploading to external portals.
   
   Features:
   • Select portal from registry dropdown
   • Paste the listing URL
   • Optional external listing ID
   • Set status and notes
   • Inline add / edit / delete
   ═══════════════════════════════════════════════════════════════ */

export default function PortalLinkManager({ propertyId, onUpdate }) {
  const { t, lang } = useApp();
  const [portals, setPortals] = useState([]);
  const [syndications, setSyndications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSyn, setEditingSyn] = useState(null);

  // Form state
  const [formPortal, setFormPortal] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formListingId, setFormListingId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (!propertyId) return;
    loadData();
  }, [propertyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch portal registry
      const regRes = await fetch('/api/portals/registry');
      const regData = await regRes.json();
      setPortals(regData.portals || []);

      // Fetch syndication records
      const { getPropertySyndications } = await import('@/lib/dal/properties');
      const synData = await getPropertySyndications(propertyId);
      setSyndications(synData || []);
    } catch (err) {
      console.error('PortalLinkManager load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormPortal('');
    setFormUrl('');
    setFormListingId('');
    setFormNotes('');
    setEditingSyn(null);
    setShowForm(false);
  };

  const handleEdit = (syn) => {
    setEditingSyn(syn);
    setFormPortal(syn.portal_name);
    setFormUrl(syn.portal_listing_url || '');
    setFormListingId(syn.portal_listing_id || '');
    setFormNotes(syn.notes || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formPortal) return;
    setSaving(true);
    try {
      const res = await fetch('/api/portals/syndication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          portal_name: formPortal,
          portal_listing_url: formUrl || null,
          portal_listing_id: formListingId || null,
          status: 'synced',
          notes: formNotes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        await loadData();
        if (onUpdate) onUpdate();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (syn) => {
    if (!confirm(lang === 'en' ? `Remove ${syn.portal_name} link?` : `¿Eliminar enlace de ${syn.portal_name}?`)) return;
    try {
      await fetch(`/api/portals/syndication?property_id=${propertyId}&portal_name=${syn.portal_name}`, {
        method: 'DELETE',
      });
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Portals not yet linked
  const linkedSlugs = syndications.filter(s => s.status !== 'removed').map(s => s.portal_name);
  const availablePortals = portals.filter(p => !linkedSlugs.includes(p.slug) || editingSyn?.portal_name === p.slug);

  if (loading) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          {t('auto_manage_links')}
        </h4>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            {t('auto_add_link')}
          </button>
        )}
      </div>

      {/* Existing links quick list */}
      {syndications.filter(s => s.status !== 'removed').length > 0 && (
        <div className="space-y-1 mb-3">
          {syndications.filter(s => s.status !== 'removed').map(syn => {
            const portal = portals.find(p => p.slug === syn.portal_name);
            return (
              <div key={syn.id || syn.portal_name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-white/5 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{portal?.icon_emoji || '🌐'}</span>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {portal?.display_name || syn.portal_name}
                  </span>
                  {syn.portal_listing_url && (
                    <span className="text-[9px] text-emerald-500 font-bold">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(syn)}
                    className="p-1 text-slate-400 hover:text-brand-500 transition-colors"
                    title={t('auto_edit')}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleRemove(syn)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title={t('auto_remove')}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-dark-border rounded-xl p-3 space-y-2.5">
          {/* Portal selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              Portal
            </label>
            <select
              value={formPortal}
              onChange={e => setFormPortal(e.target.value)}
              disabled={!!editingSyn}
              className="w-full text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white disabled:opacity-50"
            >
              <option value="">{t('auto_select_portal')}</option>
              {availablePortals.map(p => (
                <option key={p.slug} value={p.slug}>
                  {p.icon_emoji} {p.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* URL */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              {t('auto_listing_url')}
            </label>
            <input
              type="url"
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white placeholder:text-slate-300"
            />
          </div>

          {/* External ID (optional) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              {t('auto_external_id_optional')}
            </label>
            <input
              type="text"
              value={formListingId}
              onChange={e => setFormListingId(e.target.value)}
              placeholder="MLS-12345"
              className="w-full text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white placeholder:text-slate-300"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
              {t('auto_notes')}
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder={t('auto_e_g_published_on')}
              className="w-full text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white placeholder:text-slate-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!formPortal || saving}
              className="flex-1 px-3 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
              )}
              {t('auto_save')}
            </button>
            <button
              onClick={resetForm}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-dark-border text-slate-500 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              {t('auto_cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
