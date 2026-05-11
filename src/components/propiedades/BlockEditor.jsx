"use client";

import { useState } from 'react';
import Image from 'next/image';

/* ═══════════════════════════════════════════════════════════════
   BLOCK EDITOR COMPONENT
   
   A simple visual drag-and-drop or click-to-add block builder
   for development marketing pages.
   ═══════════════════════════════════════════════════════════════ */

// Simple block templates to render what a block looks like
const BlockTemplates = {
  hero: ({ content, dev }) => (
    <div className="relative w-full h-[400px] bg-slate-900 overflow-hidden flex items-center justify-center">
      {dev?.og_image_url && <Image src={dev.og_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" fill />}
      <div className="relative z-10 text-center px-4">
        {dev?.logo_url ? <Image src={dev.logo_url} alt="Logo" className="h-16 mx-auto mb-6" width={100} height={100} unoptimized /> : <h1 className="text-4xl md:text-5xl font-black text-white mb-4">{dev?.name || 'Project Name'}</h1>}
        <p className="text-xl text-emerald-400 font-medium">{content.tagline || dev?.tagline_es || 'Your headline here'}</p>
      </div>
    </div>
  ),
  text: ({ content }) => (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{content.title || 'About the Project'}</h2>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">{content.body || 'Add a compelling description of the project, its location, and the lifestyle it offers.'}</p>
    </div>
  ),
  gallery: ({ content }) => (
    <div className="py-16 px-4 bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{content.title || 'Gallery'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="aspect-[4/3] bg-gray-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">📸</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  amenities: ({ content }) => (
    <div className="max-w-5xl mx-auto py-16 px-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{content.title || 'Amenities'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {['Pool', 'Gym', 'Security', 'Clubhouse'].map(a => (
          <div key={a} className="p-6 rounded-2xl border border-gray-100 dark:border-slate-800 text-center">
            <span className="text-3xl mb-3 block text-emerald-500">✨</span>
            <span className="font-semibold text-gray-900 dark:text-white">{a}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  faq: ({ content }) => (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{content.title || 'Frequently Asked Questions'}</h2>
      <div className="space-y-4">
        {[1,2].map(i => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Question {i}?</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Answer goes here...</p>
          </div>
        ))}
      </div>
    </div>
  ),
  lead: ({ content }) => (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">{content.title || 'Interested?'}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">{content.subtitle || 'Leave your details and an agent will contact you.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <input type="text" placeholder="Name" disabled className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 opacity-70" />
        <input type="email" placeholder="Email" disabled className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 opacity-70" />
        <button disabled className="w-full sm:col-span-2 px-6 py-4 rounded-xl bg-emerald-500 text-white font-bold opacity-70">Submit</button>
      </div>
    </div>
  ),
  agent: ({ content }) => (
    <div className="py-16 px-4 bg-gray-50 dark:bg-slate-900/50 text-center">
      <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center text-3xl mb-4">👤</div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Agent Name</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">RE/MAX Altitud</p>
      <button disabled className="px-6 py-2 rounded-full border-2 border-emerald-500 text-emerald-500 font-bold opacity-70">Contact Me</button>
    </div>
  ),
  document: ({ content, updateContent }) => (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 my-8 shadow-sm group">
      <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center text-3xl mb-6">📄</div>
      <input 
        type="text" 
        value={content.title !== undefined ? content.title : 'Download Brochure'} 
        onChange={(e) => updateContent && updateContent({ title: e.target.value })}
        className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded"
        placeholder="Document Title"
      />
      <input 
        type="text" 
        value={content.subtitle !== undefined ? content.subtitle : 'Get all the details, floor plans, and pricing in our comprehensive project brochure.'} 
        onChange={(e) => updateContent && updateContent({ subtitle: e.target.value })}
        className="w-full text-gray-500 dark:text-gray-400 mb-8 text-center bg-transparent border-none focus:ring-2 focus:ring-emerald-500 rounded"
        placeholder="Subtitle"
      />
      <div className="text-left w-full space-y-4 mb-6 px-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Document URL (PDF link)</label>
          <input 
            type="url" 
            placeholder="https://example.com/brochure.pdf" 
            value={content.url || ''} 
            onChange={(e) => updateContent && updateContent({ url: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Button Text</label>
          <input 
            type="text" 
            placeholder="Download PDF" 
            value={content.buttonText || ''} 
            onChange={(e) => updateContent && updateContent({ buttonText: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" 
          />
        </div>
      </div>
      <button disabled className="px-8 py-3 rounded-xl bg-[#003DA5] text-white font-bold opacity-70 inline-flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        {content.buttonText || 'Download PDF'}
      </button>
    </div>
  )
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
