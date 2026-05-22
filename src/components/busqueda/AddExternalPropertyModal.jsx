"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { insertSearchMatch } from '@/lib/dal/searches';

export default function AddExternalPropertyModal({ isOpen, onClose, activeSearchId, l }) {
  const router = useRouter();
  const [externalForm, setExternalForm] = useState({ name: '', url: '', price: '' });

  if (!isOpen) return null;

  const handleAddExternal = async (e) => {
    e.preventDefault();
    if(!activeSearchId) return;
    try {
      await insertSearchMatch({
        search_id: activeSearchId,
        match_type: 'external',
        external_url: externalForm.url,
        property_data: { name: externalForm.name, price: externalForm.price },
        status: 'new',
        score: 100
      });
      
      onClose();
      setExternalForm({ name: '', url: '', price: '' });
      router.refresh();
    } catch(err) {
      console.error(err);
      alert('Error adding external match');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{l.modal_ext_title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <form onSubmit={handleAddExternal} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_name}</label>
            <input required type="text" value={externalForm.name} onChange={e => setExternalForm({...externalForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder={l.modal_ext_name_pl} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_price}</label>
            <input required type="number" value={externalForm.price} onChange={e => setExternalForm({...externalForm, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder="Ej. 250000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{l.modal_ext_url}</label>
            <input type="url" value={externalForm.url} onChange={e => setExternalForm({...externalForm, url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div className="pt-4">
            <button type="submit" className="w-full bg-nexus-blue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md">
              {l.btn_add_pipe}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
