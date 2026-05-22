"use client";

import { useState } from 'react';
import { useApp } from '@/lib/context';

/* ════════════════════════════════════════════════════════════════════
   WhatsAppSendButton — Property Quick-Send via WhatsApp
   ════════════════════════════════════════════════════════════════════
   Props:
     property      — property object (from Supabase)
     contactPhone  — optional pre-filled recipient phone number (digits only)
     contactName   — optional contact name for personalised AI message
     variant       — 'card' (icon-only, compact) | 'detail' (full button)
     lang          — 'es' | 'en'
   ════════════════════════════════════════════════════════════════════ */

const WhatsAppIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const SparkleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function WhatsAppSendButton({
  property,
  contactPhone = '',
  contactName  = '',
  variant      = 'detail',
  lang         = 'es',
}) {
  const { t } = useApp();

  // State
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [phone,   setPhone]   = useState(contactPhone.replace(/[^0-9]/g, ''));
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState('');

  // ── Open modal and immediately generate the AI message ──
  const handleOpen = async (e) => {
    e.preventDefault();  // prevent link navigation on card
    e.stopPropagation();
    setOpen(true);
    setError('');
    setMessage('');
    setCopied(false);

    // Regenerate fresh on every open
    setLoading(true);
    try {
      const res  = await fetch('/api/olympia/whatsapp-message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ property, lang, contactName: contactName || null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error');
      setMessage(data.message || '');
    } catch (err) {
      setError(t('wa_error') || 'No se pudo generar el mensaje. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleSend = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded    = encodeURIComponent(message);
    const url        = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const res  = await fetch('/api/olympia/whatsapp-message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ property, lang, contactName: contactName || null }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error');
      setMessage(data.message || '');
    } catch (err) {
      setError(t('wa_error') || 'No se pudo generar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  // ── Trigger button styles by variant ──
  const triggerBtn = variant === 'card' ? (
    <button
      id={`wa-send-card-${property?.id}`}
      onClick={handleOpen}
      title={t('wa_btn_send') || 'Enviar por WhatsApp'}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white transition-all duration-200 shadow-sm"
    >
      <WhatsAppIcon className="w-4 h-4" />
    </button>
  ) : (
    <button
      id={`wa-send-detail-${property?.id}`}
      onClick={handleOpen}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold transition-colors shadow-sm shadow-[#25D366]/20"
    >
      <WhatsAppIcon className="w-4 h-4" />
      {t('wa_btn_send') || 'Enviar por WhatsApp'}
    </button>
  );

  return (
    <>
      {triggerBtn}

      {/* ── Modal Overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative bg-white dark:bg-[#1a2332] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                {/* WA + Olympia badge */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-md shadow-[#25D366]/30">
                    <WhatsAppIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <SparkleIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {t('wa_modal_title') || 'Enviar por WhatsApp'}
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {t('wa_modal_subtitle') || 'Mensaje generado por Olympia AI'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Body ── */}
            <div className="px-5 py-4 space-y-4">

              {/* Property pill */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {lang === 'en'
                    ? (property?.listing_title_en || property?.listing_title_es || property?.name)
                    : (property?.listing_title_es || property?.listing_title_en || property?.name)}
                </span>
                {property?.list_price && (
                  <span className="ml-auto shrink-0 text-xs font-bold text-brand-600 dark:text-brand-400">
                    {property?.list_price_currency_id === 1 ? '₡' : '$'}
                    {Number(property.list_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  {t('wa_phone_label') || 'Número del destinatario (opcional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\- ]/g, ''))}
                    placeholder={t('wa_phone_placeholder') || 'Ej. 50612345678 (con código de país)'}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {t('wa_phone_hint') || 'Si dejas vacío, se abrirá WhatsApp para que elijas el contacto.'}
                </p>
              </div>

              {/* AI Message area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t('wa_message_label') || 'Mensaje de WhatsApp'}
                  </label>
                  {!loading && message && (
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[10px] font-bold text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    >
                      <SparkleIcon className="w-3 h-3" />
                      {t('wa_regenerate') || 'Regenerar con Olympia'}
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="min-h-[120px] rounded-xl border border-gray-100 dark:border-white/10 bg-gradient-to-br from-brand-50/50 to-purple-50/50 dark:from-brand-900/10 dark:to-purple-900/10 flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                        {t('wa_generating') || 'Olympia está redactando...'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {t('wa_generating_hint') || 'Personalizando con los detalles de la propiedad'}
                    </p>
                  </div>
                ) : error ? (
                  <div className="min-h-[80px] rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                  </div>
                ) : (
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 transition-colors leading-relaxed"
                  />
                )}
              </div>
            </div>

            {/* ── Footer Actions ── */}
            <div className="flex items-center gap-2 px-5 pb-5 pt-1">
              {/* Copy */}
              <button
                onClick={handleCopy}
                disabled={loading || !message}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {t('wa_copied') || '¡Copiado!'}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t('wa_copy') || 'Copiar'}
                  </>
                )}
              </button>

              {/* Send via WhatsApp */}
              <button
                onClick={handleSend}
                disabled={loading || !message}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold transition-all shadow-md shadow-[#25D366]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <WhatsAppIcon className="w-4 h-4" />
                {t('wa_open') || 'Abrir en WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
