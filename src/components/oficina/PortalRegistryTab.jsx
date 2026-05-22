"use client";

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';

/* ═══════════════════════════════════════════════════════════════
   PORTAL REGISTRY TAB — Office Panel
   
   Admin/broker interface for managing the portal catalog.
   Add, edit, toggle active, reorder portals.
   ═══════════════════════════════════════════════════════════════ */

const CATEGORY_LABELS = {
  manual:    { es: 'Manual', en: 'Manual', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  auto_feed: { es: 'Automático', en: 'Auto Feed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  on_request: { es: 'Bajo Solicitud', en: 'On Request', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

const SCOPE_LABELS = {
  all: 'Todos / All',
  altitud: 'Altitud',
  cero: 'Altitud Cero',
};

export default function PortalRegistryTab() {
  const { lang } = useApp();
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPortal, setEditingPortal] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    id: undefined,
    slug: '', display_name: '', icon_emoji: '🌐', url_base: '',
    category: 'manual', office_scope: 'all', display_order: 100,
    color_class: undefined,
    has_stats_api: undefined,
  });

  useEffect(() => {
    loadPortals();
  }, []);

  const loadPortals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portals/registry?all=true');
      const data = await res.json();
      setPortals(data.portals || []);
    } catch (err) {
      console.error('Load portals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      id: undefined,
      slug: '', display_name: '', icon_emoji: '🌐', url_base: '',
      category: 'manual', office_scope: 'all', display_order: 100,
      color_class: undefined,
      has_stats_api: undefined,
    });
    setEditingPortal(null);
    setShowAddForm(false);
  };

  const handleEdit = (portal) => {
    setEditingPortal(portal);
    setForm({
      id: portal.id,
      slug: portal.slug,
      display_name: portal.display_name,
      icon_emoji: portal.icon_emoji || '🌐',
      url_base: portal.url_base || '',
      category: portal.category || 'manual',
      office_scope: portal.office_scope || 'all',
      display_order: portal.display_order || 100,
      color_class: portal.color_class,
      has_stats_api: portal.has_stats_api,
    });
    setShowAddForm(true);

    // Smooth scroll to the form container so user sees it opened
    setTimeout(() => {
      document.getElementById('portal-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSave = async () => {
    if (!form.slug || !form.display_name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/portals/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        resetForm();
        await loadPortals();
      } else {
        console.error('Portal save failed:', data);
        alert('Error al guardar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Portal save error:', err);
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (portal) => {
    try {
      await fetch('/api/portals/registry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          portal_id: portal.id,
          is_active: !portal.is_active,
        }),
      });
      await loadPortals();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (portal) => {
    const confirmDelete = confirm(
      lang === 'en'
        ? `Are you sure you want to permanently delete the portal "${portal.display_name}"?\n\nThis will remove it from the catalog. Historical syndications under this portal name will remain unaffected, but agents will not be able to select it anymore.`
        : `¿Estás seguro de que deseas eliminar permanentemente el portal "${portal.display_name}"?\n\nEsto lo eliminará del catálogo. Las publicaciones históricas bajo este portal no se verán afectadas, pero los agentes ya no podrán seleccionarlo.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/portals/registry?id=${portal.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadPortals();
      } else {
        alert(lang === 'en' ? 'Error deleting: ' + data.error : 'Error al eliminar: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = portals.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            {lang === 'en' ? 'Portal Registry' : 'Registro de Portales'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeCount} {lang === 'en' ? 'active portals' : 'portales activos'} · {portals.length} {lang === 'en' ? 'total' : 'total'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          {lang === 'en' ? 'Add Portal' : 'Agregar Portal'}
        </button>
      </div>

      {/* Add/Edit Form */}
      <div id="portal-form-container">
        {showAddForm && (
          <div className="glass-panel rounded-2xl p-5 border-2 border-brand-200 dark:border-brand-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
              {editingPortal ? (lang === 'en' ? 'Edit Portal' : 'Editar Portal') : (lang === 'en' ? 'New Portal' : 'Nuevo Portal')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Slug (ID)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                  disabled={!!editingPortal}
                  placeholder="mi_portal"
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{lang === 'en' ? 'Display Name' : 'Nombre'}</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="Portal Name"
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t('ofc_portal_emoji')}</label>
                <input
                  type="text"
                  value={form.icon_emoji}
                  onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))}
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t('ofc_portal_base_url')}</label>
                <input
                  type="url"
                  value={form.url_base}
                  onChange={e => setForm(f => ({ ...f, url_base: e.target.value }))}
                  placeholder="https://..."
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{lang === 'en' ? 'Category' : 'Categoría'}</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                >
                  <option value="manual">{t('ofc_portal_manual')}</option>
                  <option value="auto_feed">Auto Feed / API</option>
                  <option value="on_request">{lang === 'en' ? 'On Request' : 'Bajo Solicitud'}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{lang === 'en' ? 'Office' : 'Oficina'}</label>
                <select
                  value={form.office_scope}
                  onChange={e => setForm(f => ({ ...f, office_scope: e.target.value }))}
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                >
                  <option value="all">{lang === 'en' ? 'All Offices' : 'Todas'}</option>
                  <option value="altitud">{t('ofc_portal_altitud')}</option>
                  <option value="cero">{t('ofc_portal_cero')}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{lang === 'en' ? 'Display Order' : 'Orden'}</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 100 }))}
                  className="w-full text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-dark-border rounded-lg px-3 py-2 text-slate-700 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={!form.slug || !form.display_name || saving}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {lang === 'en' ? 'Save' : 'Guardar'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-slate-500 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portal Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-dark-border">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Portal</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Category' : 'Categoría'}</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Office' : 'Oficina'}</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Active' : 'Activo'}</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {portals.map((portal, i) => {
                const catConfig = CATEGORY_LABELS[portal.category] || CATEGORY_LABELS.manual;
                return (
                  <tr key={portal.id} className={`border-b border-slate-50 dark:border-dark-border last:border-0 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02] ${!portal.is_active ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3 text-xs text-slate-300 dark:text-slate-600 tabular-nums">{portal.display_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{portal.icon_emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{portal.display_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{portal.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${catConfig.color}`}>
                        {lang === 'en' ? catConfig.en : catConfig.es}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{SCOPE_LABELS[portal.office_scope] || portal.office_scope}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(portal)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${portal.is_active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${portal.is_active ? 'left-[18px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(portal)}
                          className="text-slate-400 hover:text-brand-500 transition-colors p-1"
                          title={lang === 'en' ? 'Edit' : 'Editar'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(portal)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title={lang === 'en' ? 'Delete permanently' : 'Eliminar permanentemente'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
