"use client";

import { useState } from 'react';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   BLOCK EDITOR COMPONENT
   
   A simple visual drag-and-drop or click-to-add block builder
   for development marketing pages.
   ═══════════════════════════════════════════════════════════════ */

// Shared inline input styles
const inCls = "w-full bg-white/70 dark:bg-slate-700/70 border border-dashed border-emerald-400/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors";
const labelCls = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1";

// Reusable inline text field
function Field({ label, value, onChange, placeholder, multiline }) {
  return (
    <div className="mb-3">
      {label && <label className={labelCls}>{label}</label>}
      {multiline ? (
        <textarea rows={3} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inCls} />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inCls} />
      )}
    </div>
  );
}

// Reusable list editor (array of objects with icon+label, or q+a, etc.)
function ListEditor({ items = [], onChange, fields, addLabel }) {
  const add = () => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, key, val) => { const n = [...items]; n[i] = { ...n[i], [key]: val }; onChange(n); };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-white/50 dark:bg-slate-700/50 rounded-lg p-2">
          {fields.map(f => (
            <input key={f.key} type="text" value={item[f.key] || ''} onChange={e => update(i, f.key, e.target.value)}
              placeholder={f.placeholder} className={`${inCls} flex-1`} />
          ))}
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-sm p-1 shrink-0">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 border border-dashed border-emerald-400/50 rounded-lg px-3 py-1.5 w-full">
        + {addLabel}
      </button>
    </div>
  );
}

// Simple block templates to render what a block looks like
const BlockTemplates = {
  hero: ({ content, dev, updateContent }) => (
    <div className="relative w-full h-[360px] bg-slate-900 overflow-hidden flex items-center justify-center">
      {dev?.og_image_url && <Image src={dev.og_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" fill />}
      <div className="relative z-10 text-center px-6 w-full max-w-2xl mx-auto">
        {dev?.logo_url
          ? <Image src={dev.logo_url} alt="Logo" className="h-14 mx-auto mb-5" width={120} height={56} unoptimized />
          : <h1 className="text-4xl font-black text-white mb-3">{dev?.name || 'Project Name'}</h1>}
        <input type="text" value={content.tagline || ''} onChange={e => updateContent({ tagline: e.target.value })}
          placeholder={dev?.tagline_es || 'Edit your hero tagline here…'}
          className="w-full text-center text-xl font-medium bg-transparent text-emerald-300 placeholder-emerald-400/60 border-b border-emerald-400/40 focus:outline-none focus:border-emerald-400 pb-1" />
        <p className="text-xs text-white/40 mt-3">Hero image: set Cover Image URL in ⚙ Ajustes</p>
      </div>
    </div>
  ),

  text: ({ content, updateContent }) => (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-4">
      <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="About the Project" />
      <Field label="Body Text" value={content.body} onChange={v => updateContent({ body: v })} placeholder="Add a compelling description…" multiline />
    </div>
  ),

  gallery: ({ content, updateContent }) => (
    <div className="py-10 px-6 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <Field label="Gallery Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Photo Gallery" />
        <ListEditor
          items={content.images || []}
          onChange={imgs => updateContent({ images: imgs })}
          fields={[{ key: 'url', placeholder: 'Image URL (https://…)' }, { key: 'alt', placeholder: 'Alt text' }]}
          addLabel="Add Image"
        />
        {(content.images || []).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {(content.images || []).slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-[4/3] bg-gray-200 dark:bg-slate-800 rounded-xl overflow-hidden relative">
                {img.url && <Image src={img.url} alt={img.alt || ''} fill className="object-cover" />}
                {!img.url && <span className="absolute inset-0 flex items-center justify-center text-3xl">📸</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ),

  amenities: ({ content, updateContent }) => (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Amenities & Features" />
      <ListEditor
        items={content.items || []}
        onChange={items => updateContent({ items })}
        fields={[{ key: 'icon', placeholder: '✨ Emoji' }, { key: 'label', placeholder: 'Feature name' }]}
        addLabel="Add Amenity"
      />
      {(content.items || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {(content.items || []).map((a, i) => (
            <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
              <span className="text-2xl mb-2 block">{a.icon || '✨'}</span>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{a.label || 'Feature'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  ),

  faq: ({ content, updateContent }) => (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Frequently Asked Questions" />
      <ListEditor
        items={content.items || []}
        onChange={items => updateContent({ items })}
        fields={[{ key: 'q', placeholder: 'Question?' }, { key: 'a', placeholder: 'Answer…' }]}
        addLabel="Add Question"
      />
    </div>
  ),

  lead: ({ content, updateContent }) => (
    <div className="max-w-2xl mx-auto py-10 px-6 text-center">
      <Field label="Heading" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Interested?" />
      <Field label="Subtitle" value={content.subtitle} onChange={v => updateContent({ subtitle: v })} placeholder="Leave your details and an agent will contact you." />
      <Field label="Button Text" value={content.cta} onChange={v => updateContent({ cta: v })} placeholder="I'm Interested" />
      <div className="grid grid-cols-2 gap-3 mt-4 opacity-50 pointer-events-none">
        <input disabled placeholder="Name" className="col-span-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm" />
        <input disabled placeholder="Email" className="col-span-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-sm" />
        <button disabled className="col-span-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm">{content.cta || "I'm Interested"}</button>
      </div>
    </div>
  ),

  agent: ({ content }) => (
    <div className="py-10 px-6 bg-gray-50 dark:bg-slate-900/50 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center text-3xl mb-4">👤</div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Agent Card</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Agent info is pulled automatically from your profile.</p>
    </div>
  ),

  video: ({ content, updateContent }) => (
    <div className="py-10 px-6 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Project Video" />
        <Field label="YouTube / Vimeo Embed URL" value={content.url} onChange={v => updateContent({ url: v })} placeholder="https://www.youtube.com/embed/…" />
        {content.url ? (
          <div className="aspect-video rounded-2xl overflow-hidden mt-3 shadow-lg">
            <iframe src={content.url} title="Video" allowFullScreen className="w-full h-full" />
          </div>
        ) : (
          <div className="aspect-video rounded-2xl bg-gray-200 dark:bg-slate-800 flex items-center justify-center mt-3">
            <span className="text-5xl opacity-40">▶️</span>
          </div>
        )}
      </div>
    </div>
  ),

  map: ({ content, updateContent }) => (
    <div className="py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Location" />
        <Field label="Google Maps Embed URL" value={content.embed_url} onChange={v => updateContent({ embed_url: v })} placeholder="https://maps.google.com/maps?q=…&output=embed" />
        <Field label="Or text address (if no embed)" value={content.address} onChange={v => updateContent({ address: v })} placeholder="San José, Costa Rica" />
        {content.embed_url ? (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden mt-3 shadow-lg">
            <iframe src={content.embed_url} title="Map" allowFullScreen loading="lazy" className="w-full h-full border-0" />
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-2xl bg-gray-200 dark:bg-slate-800 flex items-center justify-center mt-3">
            <span className="text-5xl opacity-40">🗺️</span>
          </div>
        )}
      </div>
    </div>
  ),

  stats: ({ content, updateContent }) => (
    <div className="py-10 px-6 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto">
        <Field label="Section Title (optional)" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Project Numbers" />
        <ListEditor
          items={content.items || []}
          onChange={items => updateContent({ items })}
          fields={[{ key: 'value', placeholder: '48' }, { key: 'label', placeholder: 'Lots Available' }]}
          addLabel="Add Stat"
        />
        {(content.items || []).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
            {(content.items || []).map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-emerald-500">{s.value || '—'}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{s.label || 'Label'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ),

  social: ({ content, updateContent }) => (
    <div className="py-8 px-6">
      <div className="max-w-xl mx-auto">
        <p className={labelCls}>Social / External Links</p>
        <ListEditor
          items={content.links || []}
          onChange={links => updateContent({ links })}
          fields={[{ key: 'icon', placeholder: '📸 Emoji' }, { key: 'url', placeholder: 'https://instagram.com/…' }]}
          addLabel="Add Link"
        />
      </div>
    </div>
  ),

  inventory: ({ content, updateContent, dev }) => (
    <div className="py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <Field label="Section Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder={`Available ${dev?.unit_label || 'Units'}`} />
        <div className="mt-4 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
          <span className="text-3xl mb-3 block">🏘️</span>
          <p className="font-semibold text-gray-700 dark:text-gray-300">Inventory Block</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Properties linked to this development via the <strong>Inventario</strong> tab will appear here automatically on the public page.
          </p>
        </div>
      </div>
    </div>
  ),

  document: ({ content, updateContent }) => (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <div className="text-center border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center text-3xl mb-5">📄</div>
        <div className="space-y-3 text-left">
          <Field label="Document Title" value={content.title} onChange={v => updateContent({ title: v })} placeholder="Download Brochure" />
          <Field label="Subtitle" value={content.subtitle} onChange={v => updateContent({ subtitle: v })} placeholder="Get all the details in our project brochure." />
          <Field label="PDF URL" value={content.url} onChange={v => updateContent({ url: v })} placeholder="https://drive.google.com/…" />
          <Field label="Button Text" value={content.buttonText} onChange={v => updateContent({ buttonText: v })} placeholder="Download PDF" />
        </div>
        <button disabled className="mt-5 px-8 py-3 rounded-xl bg-[#003DA5] text-white font-bold opacity-70 text-sm">
          {content.buttonText || 'Download PDF'}
        </button>
      </div>
    </div>
  ),
};

export default function BlockEditor({ development, blocks, onChange }) {

  const [activeBlockIndex, setActiveBlockIndex] = useState(null);

  const moveBlock = (index, dir) => {
    if (index + dir < 0 || index + dir >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + dir];
    newBlocks[index + dir] = temp;
    onChange(newBlocks);
    setActiveBlockIndex(index + dir);
  };

  const removeBlock = (index) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    onChange(newBlocks);
    if (activeBlockIndex === index) setActiveBlockIndex(null);
  };

  return (
    <div className="flex flex-col space-y-4">
      {blocks.map((block, index) => {
        const Template = BlockTemplates[block.type];
        const isActive = activeBlockIndex === index;

        return (
          <div 
            key={block.id || index} 
            className={`relative rounded-3xl overflow-hidden border-2 transition-all cursor-pointer ${isActive ? 'border-emerald-500 shadow-xl shadow-emerald-500/10' : 'border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}
            onClick={() => setActiveBlockIndex(index)}
          >
            {/* Block Controls (only visible when active or hovering) */}
            <div className={`absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-xl p-1 shadow-lg transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              <button onClick={(e) => { e.stopPropagation(); moveBlock(index, -1); }} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); moveBlock(index, 1); }} disabled={index === blocks.length - 1} className="p-1.5 text-gray-500 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1" />
              <button onClick={(e) => { e.stopPropagation(); removeBlock(index); }} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>

            {/* Block Content Wrapper */}
            <div className={`transition-all ${isActive ? 'ring-4 ring-emerald-500/20' : ''}`}>
              {Template ? <Template content={block.content || {}} dev={development} updateContent={(newContent) => {
                const newBlocks = [...blocks];
                newBlocks[index].content = { ...newBlocks[index].content, ...newContent };
                onChange(newBlocks);
              }} /> : <div className="p-8 text-center text-red-500">Unknown block type: {block.type}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
