"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

const trackEvent = async (devId, propId, type, meta = {}) => {
  if (!devId) return;
  try {
    let device_type = 'desktop';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) device_type = 'tablet';
      else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent)) device_type = 'mobile';
    }
    
    await supabase.from('page_events').insert({
      development_id: devId,
      property_id: propId || null,
      event_type: type,
      event_meta: { ...meta, device_type },
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    });
  } catch (err) {
    console.error('Tracking error:', err);
  }
};

/* ═══════════════════════════════════════════════════════════════
   DEVELOPMENT LANDING PAGE — Premium Public Renderer
   
   Renders JSONB sections into a beautiful, responsive
   public-facing marketing page for real estate developments.
   ═══════════════════════════════════════════════════════════════ */

// ── Lead Capture Form ─────────────────────────────────────────
function LeadForm({ development, content }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSending(true);
    try {
      await fetch('/api/public/properties/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          development_id: development.id,
          source: 'landing_page',
          ...form,
        }),
      });
      await trackEvent(development.id, null, 'lead_submit', { name: form.name, email: form.email });
      setSent(true);
    } catch { /* silent */ } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-white mb-2">Thank you!</h3>
        <p className="text-white/60">We&apos;ll be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-xl mx-auto">
      <input type="text" required placeholder="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 backdrop-blur-sm" />
      <input type="email" required placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
        className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 backdrop-blur-sm" />
      <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 backdrop-blur-sm" />
      <input type="text" placeholder="Message (optional)" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
        className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 backdrop-blur-sm" />
      <button type="submit" disabled={sending}
        className="sm:col-span-2 w-full px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.98] disabled:opacity-60">
        {sending ? 'Sending...' : (content?.cta || "I'm Interested")}
      </button>
    </form>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FAQItem({ q, a, devId }) {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    const newState = !open;
    setOpen(newState);
    if (newState) {
      trackEvent(devId, null, 'faq_expand', { question: q });
    }
  };

  return (
    <div className="border-b border-gray-200/10 last:border-0">
      <button onClick={handleToggle}
        className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors pr-4">{q}</span>
        <svg className={`w-5 h-5 text-emerald-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Block Renderers ───────────────────────────────────────────
const Blocks = {
  hero: ({ content, dev }) => (
    <section className="relative w-full min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
      {dev.og_image_url && (
        <Image src={dev.og_image_url} alt={dev.name} className="absolute inset-0 w-full h-full object-cover" fill />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {dev.logo_url ? (
          <Image src={dev.logo_url} alt={`${dev.name} logo`} className="h-16 md:h-20 mx-auto mb-8 drop-shadow-2xl" width={8} height={64} />
        ) : null}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
          {dev.name}
        </h1>
        <p className="text-lg md:text-2xl text-emerald-300 font-medium max-w-2xl mx-auto leading-relaxed">
          {content?.tagline || dev.tagline_es || dev.tagline_en || ''}
        </p>
        {dev.developer_name && (
          <p className="mt-6 text-sm text-white/50 uppercase tracking-widest font-bold">
            by {dev.developer_name}
          </p>
        )}
      </div>
    </section>
  ),

  text: ({ content }) => (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        {content?.title && (
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">{content.title}</h2>
        )}
        <p className="text-lg md:text-xl text-gray-400 leading-relaxed whitespace-pre-line">{content?.body || ''}</p>
      </div>
    </section>
  ),

  gallery: ({ content }) => {
    const images = content?.images || [];
    if (images.length === 0) return null;
    return (
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          {content?.title && (
            <h2 className="text-3xl font-bold text-white mb-10 text-center">{content.title}</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {images.map((img, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer">
                <Image src={img.url || img} alt={img.alt || `Gallery ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" fill />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },

  amenities: ({ content }) => {
    const items = content?.items || [];
    return (
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          {content?.title && (
            <h2 className="text-3xl font-bold text-white mb-12 text-center">{content.title}</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {items.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group">
                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{item.icon || '✨'}</span>
                <span className="font-semibold text-white text-sm">{item.label || item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },

  video: ({ content }) => (
    <section className="py-20 px-6 bg-white/[0.02]">
      <div className="max-w-4xl mx-auto">
        {content?.title && (
          <h2 className="text-3xl font-bold text-white mb-10 text-center">{content.title}</h2>
        )}
        {content?.url && (
          <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <iframe src={content.url} title={content.title || 'Video'} allowFullScreen
              className="w-full h-full" />
          </div>
        )}
      </div>
    </section>
  ),

  inventory: ({ content, dev, properties }) => {
    const available = properties?.filter(p => p.status === 'approved' || p.status === 'published') || [];
    if (available.length === 0) return null;
    return (
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4 text-center">
            {content?.title || `Available ${dev.unit_label}`}
          </h2>
          <p className="text-gray-400 text-center mb-10">{available.length} {dev.unit_label?.toLowerCase()} available</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {available.map(prop => (
              <div key={prop.id} onClick={() => trackEvent(dev.id, prop.id, 'listing_click')} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-emerald-500/30 transition-all group cursor-pointer">
                {prop.main_image_url && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <Image src={prop.main_image_url} alt={prop.title_es || prop.title_en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" fill />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-white mb-1">{prop.title_es || prop.title_en}</h3>
                  <p className="text-sm text-gray-400 mb-3">{prop.property_type} • {prop.size_m2?.toLocaleString()} m²</p>
                  {prop.price && (
                    <p className="text-emerald-400 font-bold text-lg">${prop.price.toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },

  map: ({ content }) => (
    <section className="py-20 px-6 bg-white/[0.02]">
      <div className="max-w-5xl mx-auto">
        {content?.title && (
          <h2 className="text-3xl font-bold text-white mb-10 text-center">{content.title}</h2>
        )}
        {content?.embed_url ? (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
            <iframe src={content.embed_url} title="Location Map" allowFullScreen loading="lazy"
              className="w-full h-full border-0" />
          </div>
        ) : content?.address ? (
          <p className="text-center text-gray-400 text-lg">{content.address}</p>
        ) : null}
      </div>
    </section>
  ),

  faq: ({ content, dev }) => {
    const items = content?.items || [];
    if (items.length === 0) return null;
    return (
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10 text-center">{content?.title || 'FAQ'}</h2>
          <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5 px-6">
            {items.map((item, i) => (
              <FAQItem key={i} q={item.q || item.question} a={item.a || item.answer} devId={dev.id} />
            ))}
          </div>
        </div>
      </section>
    );
  },

  lead: ({ content, dev }) => (
    <section className="py-20 md:py-28 px-6 bg-gradient-to-b from-emerald-900/20 to-transparent">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          {content?.title || "Interested?"}
        </h2>
        <p className="text-gray-400 mb-10 text-lg">
          {content?.subtitle || 'Leave your details and an agent will contact you shortly.'}
        </p>
        <LeadForm development={dev} content={content} />
      </div>
    </section>
  ),

  agent: ({ content, agent, dev }) => {
    if (!agent) return null;
    const waLink = agent.phone
      ? `https://wa.me/${agent.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in learning more about this development.`)}`
      : null;
    return (
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-md mx-auto text-center">
          {agent.avatar_url ? (
            <Image src={agent.avatar_url} alt={agent.full_name}
              className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-emerald-500/30 object-cover shadow-xl" width={96} height={96} />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-6 bg-emerald-500/20 flex items-center justify-center text-4xl text-emerald-400 border-4 border-emerald-500/30">
              {agent.full_name?.[0] || '👤'}
            </div>
          )}
          <h3 className="text-xl font-bold text-white">{agent.full_name}</h3>
          <p className="text-emerald-400 font-medium text-sm mb-1">
            RE/MAX {agent.office === 'cero' ? 'Altitud Cero' : 'Altitud'}
          </p>
          {agent.email && <p className="text-gray-500 text-sm mb-6">{agent.email}</p>}
          <div className="flex items-center justify-center gap-3">
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                onClick={() => trackEvent(dev?.id, null, 'whatsapp_click')}
                className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-lg shadow-[#25D366]/20 transition-all active:scale-95 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.77-6.396-2.076l-.446-.334-2.635.884.884-2.635-.334-.446A9.95 9.95 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp
              </a>
            )}
            {agent.email && (
              <a href={`mailto:${agent.email}`}
                className="px-6 py-3 rounded-xl border-2 border-white/20 hover:border-emerald-500 text-white font-bold transition-all hover:bg-emerald-500/10">
                Email
              </a>
            )}
          </div>
        </div>
      </section>
    );
  },

  social: ({ content, dev }) => {
    const links = content?.links || [];
    if (links.length === 0) return null;
    return (
      <section className="py-12 px-6">
        <div className="flex items-center justify-center gap-4">
          {links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent(dev?.id, null, 'social_click', { url: link.url })}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
              <span className="text-lg">{link.icon || '🔗'}</span>
            </a>
          ))}
        </div>
      </section>
    );
  },

  stats: ({ content }) => {
    const items = content?.items || [];
    if (items.length === 0) return null;
    return (
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-emerald-400 mb-2">{item.value}</div>
                <div className="text-sm text-gray-400 uppercase tracking-widest font-bold">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  },
  
  document: ({ content, dev }) => {
    if (!content?.url) return null;
    return (
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto text-center p-12 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center text-4xl mb-6 shadow-lg shadow-blue-500/10">📄</div>
          <h2 className="text-3xl font-bold text-white mb-4">{content.title || 'Download Brochure'}</h2>
          <p className="text-gray-400 mb-10 text-lg">{content.subtitle || 'Get all the details, floor plans, and pricing in our comprehensive project brochure.'}</p>
          <a 
            href={content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={() => trackEvent(dev?.id, null, 'pdf_download', { url: content.url })}
            className="px-10 py-4 rounded-xl bg-[#003DA5] hover:bg-[#002d7a] text-white text-lg font-bold shadow-xl shadow-blue-900/30 transition-all hover:-translate-y-1 inline-flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {content.buttonText || 'Download PDF'}
          </a>
        </div>
      </section>
    );
  },
};

// ── Main Component ────────────────────────────────────────────
export default function DevelopmentLanding({ development, properties, agent }) {
  const sections = development.sections || [];

  useEffect(() => {
    trackEvent(development?.id, null, 'page_view');
  }, [development?.id]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">

      {/* Render all JSONB sections in order */}
      {sections.map((section, i) => {
        const Block = Blocks[section.type];
        if (!Block) return null;
        return (
          <Block
            key={section.id || i}
            content={section.content || {}}
            dev={development}
            properties={properties}
            agent={agent}
          />
        );
      })}

      {/* If no sections, show a minimal fallback */}
      {sections.length === 0 && (
        <>
          {Blocks.hero({ content: {}, dev: development })}
          <section className="py-20 px-6 text-center">
            <p className="text-gray-400 text-lg">This development page is being prepared. Check back soon.</p>
          </section>
          {agent && Blocks.agent({ content: {}, agent, dev: development })}
        </>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} RE/MAX Altitud. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Powered by Altitud Hub
          </p>
        </div>
      </footer>
    </div>
  );
}
