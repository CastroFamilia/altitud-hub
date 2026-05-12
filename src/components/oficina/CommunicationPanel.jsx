"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/lib/context';

const CHANNELS = [
  { key: 'whatsapp', icon: '💬', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' },
  { key: 'email', icon: '📧', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { key: 'phone', icon: '📱', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  { key: 'in_person', icon: '🤝', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
];

const CHANNEL_MAP = Object.fromEntries(CHANNELS.map(c => [c.key, c]));

const TEMPLATES = {
  propiedad_especifica: 'ofc_leads_template_property',
  comprar: 'ofc_leads_template_buy',
  vender: 'ofc_leads_template_sell',
  alquiler: 'ofc_leads_template_rent',
  otro: 'ofc_leads_template_general',
};

export default function CommunicationPanel({ lead, agentId, communications = [], onUpdate, onFollowUpCreated }) {
  const { t, lang } = useApp();
  const es = lang === 'es';

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ channel: 'whatsapp', direction: 'outbound', summary: '', follow_up_date: '' });

  const leadComms = communications.filter(c => c.inquiry_id === lead.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleSave = async () => {
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const payload = {
        inquiry_id: lead.id,
        agent_id: agentId || null,
        channel: form.channel,
        direction: form.direction,
        summary: form.summary.trim(),
        follow_up_date: form.follow_up_date || null,
      };
      await supabase.from('lead_communications').insert(payload);

      // If follow-up date was set, also create a follow-up reminder
      if (form.follow_up_date) {
        await supabase.from('lead_follow_ups').insert({
          inquiry_id: lead.id,
          agent_id: agentId || null,
          due_date: form.follow_up_date,
          note: form.summary.trim(),
          status: 'pending',
        });
        onFollowUpCreated?.();
      }

      setForm({ channel: 'whatsapp', direction: 'outbound', summary: '', follow_up_date: '' });
      setShowForm(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error saving communication:', err);
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (d) => {
    // eslint-disable-next-line react-hooks/purity
    const mins = Math.floor((Date.now() - new Date(d)) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(d).toLocaleDateString();
  };

  // Build pre-filled WhatsApp message
  const getTemplateMessage = () => {
    const templateKey = TEMPLATES[lead.lead_type] || TEMPLATES.otro;
    let msg = t(templateKey);
    msg = msg.replace('{name}', lead.lead_name || '');
    const propTitle = lead.properties ? (es ? lead.properties.listing_title_es : lead.properties.listing_title_en) || lead.properties.name : '';
    msg = msg.replace('{property}', propTitle);
    return encodeURIComponent(msg);
  };

  const inputCls = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      {/* Quick Actions Row — WhatsApp + Email with templates */}
      <div className="flex flex-wrap items-center gap-2">
        {lead.lead_phone && (
          <a href={`https://wa.me/${lead.lead_phone.replace(/[^0-9]/g, '')}?text=${getTemplateMessage()}`} target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm">
            💬 WhatsApp
          </a>
        )}
        {lead.lead_email && (
          <a href={`mailto:${lead.lead_email}?subject=${encodeURIComponent(es ? 'RE/MAX ALTITUD - Consulta' : 'RE/MAX ALTITUD - Inquiry')}`}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm">
            📧 Email
          </a>
        )}
        <button onClick={() => setShowForm(!showForm)}
          className="bg-nexus-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors shadow-sm ml-auto">
          <span>+</span> {t('ofc_leads_comm_log')}
        </button>
      </div>

      {/* Log Interaction Form */}
      {showForm && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Channel */}
            <div className="flex gap-1">
              {CHANNELS.map(ch => (
                <button key={ch.key} onClick={() => setForm(p => ({ ...p, channel: ch.key }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${form.channel === ch.key ? ch.color + ' ring-2 ring-blue-400' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {ch.icon} {ch.key === 'in_person' ? (es ? 'Presencial' : 'In Person') : ch.key.charAt(0).toUpperCase() + ch.key.slice(1)}
                </button>
              ))}
            </div>
            {/* Direction */}
            <div className="flex gap-1 ml-auto">
              {['outbound', 'inbound'].map(dir => (
                <button key={dir} onClick={() => setForm(p => ({ ...p, direction: dir }))}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${form.direction === dir ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {dir === 'outbound' ? '↗️' : '↙️'} {t('ofc_leads_comm_' + dir)}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
            placeholder={t('ofc_leads_comm_summary_placeholder')} rows={2} className={inputCls + " resize-none"} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">🔔 {t('ofc_leads_comm_followup_date')}</label>
              <input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white" />
            </div>
            <button onClick={handleSave} disabled={!form.summary.trim() || saving}
              className="bg-nexus-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 shadow-sm">
              {saving ? t('ofc_leads_comm_saving') : t('ofc_leads_comm_save')}
            </button>
          </div>
        </div>
      )}

      {/* Communication Timeline */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t('ofc_leads_comm_title')}</p>
        {leadComms.length === 0 ? (
          <div className="text-center py-4 text-slate-400">
            <p className="text-xs">{t('ofc_leads_comm_empty')}</p>
            <p className="text-[10px] mt-0.5">{t('ofc_leads_comm_empty_desc')}</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
            {leadComms.map(comm => {
              const ch = CHANNEL_MAP[comm.channel] || CHANNEL_MAP.whatsapp;
              return (
                <div key={comm.id} className="flex items-start gap-2 py-1.5">
                  <div className="flex flex-col items-center gap-0.5 pt-0.5">
                    <span className="text-sm">{ch.icon}</span>
                    <span className="text-[8px] text-slate-400">{comm.direction === 'outbound' ? '↗️' : '↙️'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{comm.summary}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400">{timeAgo(comm.created_at)}</span>
                      {comm.follow_up_date && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${new Date(comm.follow_up_date) < new Date() ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          🔔 {new Date(comm.follow_up_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
