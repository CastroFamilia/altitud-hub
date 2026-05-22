"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchACMLocations } from '@/lib/locations';

export default function AddRequirementModal({ isOpen, onClose, l }) {
  const router = useRouter();

  const initialForm = {
    client_name: '', operation_type: 'venta', property_type: 'Lote',
    zones: [], price_min: '', price_max: '', price_tolerance: 10,
    min_bedrooms: '', min_bathrooms: '', min_sqm: '', min_sqm_unit: 'm2',
    must_haves: [], nice_to_haves: [], purchase_timeframe: '3_6_meses', purchase_type: 'credito_otorgado'
  };

  const [form, setForm] = useState(initialForm);
  const [tagInput, setTagInput] = useState({ zone: '', must: '', nice: '' });
  const [zoneSuggestions, setZoneSuggestions] = useState([]);

  if (!isOpen) return null;

  const handleAddTag = (field, val) => {
    if (!val.trim()) return;
    setForm({ ...form, [field]: [...form[field], val.trim()] });
    if (field === 'zones') setTagInput({ ...tagInput, zone: '' });
    if (field === 'must_haves') setTagInput({ ...tagInput, must: '' });
    if (field === 'nice_to_haves') setTagInput({ ...tagInput, nice: '' });
  };

  const handleRemoveTag = (field, index) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const handleCreateSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error(await res.text());
      
      onClose();
      setForm(initialForm);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Error creating search');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black italic text-slate-900 dark:text-white">{l.modal_req_title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>
        <form onSubmit={handleCreateSearch} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_name}</label>
            <input required type="text" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_name_pl} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_op}</label>
              <select value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                <option value="venta">{l.op_sale}</option>
                <option value="alquiler">{l.op_rent}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_type}</label>
              <select value={form.property_type} onChange={e => setForm({...form, property_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                <option value="Lote">{l.type_lot}</option>
                <option value="Casa">{l.type_house}</option>
                <option value="Apartamento">{l.type_apt}</option>
                <option value="Comercial">{l.type_com}</option>
                <option value="Zona Rural">{l.type_farm}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_zones}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.zones.map((z, i) => (
                  <span key={i} className="bg-nexus-blue/10 text-nexus-blue px-2 py-1 rounded text-xs flex items-center gap-1 font-bold">
                    {z} <button type="button" onClick={() => handleRemoveTag('zones', i)} className="hover:text-blue-800">&times;</button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={tagInput.zone} 
                    onChange={e => {
                      const val = e.target.value;
                      setTagInput({...tagInput, zone: val});
                      setZoneSuggestions(val.length > 1 ? searchACMLocations(val, 10) : []);
                    }} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagInput.zone.trim()) {
                          handleAddTag('zones', tagInput.zone);
                          setZoneSuggestions([]);
                        }
                      }
                    }} 
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none" 
                    placeholder={l.modal_req_zones_pl} 
                    autoComplete="off"
                  />
                  <button type="button" onClick={() => {
                    handleAddTag('zones', tagInput.zone);
                    setZoneSuggestions([]);
                  }} className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
                </div>
                {zoneSuggestions.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                    {zoneSuggestions.map((loc, i) => (
                      <li 
                        key={i} 
                        onClick={() => {
                          handleAddTag('zones', loc.display);
                          setZoneSuggestions([]);
                        }}
                        className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                      >
                        <span className="font-bold">{loc.barrio || loc.district}</span>
                        <span className="text-slate-400 ml-1">, {loc.canton}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          {['Lote', 'Zona Rural'].includes(form.property_type) ? (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_min_area}</label>
                <div className="flex gap-2">
                  <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_area_pl} />
                  <select value={form.min_sqm_unit} onChange={e => setForm({...form, min_sqm_unit: e.target.value})} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                    <option value="m2">{l.unit_m2}</option>
                    <option value="ha">{l.unit_ha}</option>
                    <option value="acres">{l.unit_ac}</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_beds}</label>
                <input type="number" value={form.min_bedrooms} onChange={e => setForm({...form, min_bedrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_beds_pl} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_baths}</label>
                <input type="number" step="0.5" value={form.min_bathrooms} onChange={e => setForm({...form, min_bathrooms: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_baths_pl} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_const}</label>
                <input type="number" value={form.min_sqm} onChange={e => setForm({...form, min_sqm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder={l.modal_req_const_pl} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pmin}</label>
              <input type="number" value={form.price_min} onChange={e => setForm({...form, price_min: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="0" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pmax}</label>
              <input type="number" value={form.price_max} onChange={e => setForm({...form, price_max: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue" placeholder="500000" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_tol}</label>
              <select value={form.price_tolerance} onChange={e => setForm({...form, price_tolerance: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                <option value="0">{l.tol_0}</option>
                <option value="5">{l.tol_5}</option>
                <option value="10">{l.tol_10}</option>
                <option value="15">{l.tol_15}</option>
                <option value="20">{l.tol_20}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">{l.modal_req_must}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.must_haves.map((m, i) => (
                  <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                    {m} <button type="button" onClick={() => handleRemoveTag('must_haves', i)} className="hover:text-emerald-900">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={tagInput.must} onChange={e => setTagInput({...tagInput, must: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('must_haves', tagInput.must))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder={l.modal_req_must_pl} />
                <button type="button" onClick={() => handleAddTag('must_haves', tagInput.must)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">{l.modal_req_nice}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.nice_to_haves.map((n, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                    {n} <button type="button" onClick={() => handleRemoveTag('nice_to_haves', i)} className="hover:text-blue-900">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={tagInput.nice} onChange={e => setTagInput({...tagInput, nice: e.target.value})} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag('nice_to_haves', tagInput.nice))} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none" placeholder={l.modal_req_nice_pl} />
                <button type="button" onClick={() => handleAddTag('nice_to_haves', tagInput.nice)} className="bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-300">+</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_time}</label>
              <select value={form.purchase_timeframe} onChange={e => setForm({...form, purchase_timeframe: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                <option value="urgente">{l.time_urg}</option>
                <option value="3_6_meses">{l.time_3_6}</option>
                <option value="mas_6_meses">{l.time_6_plus}</option>
                <option value="no_sabe">{l.time_dk}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">{l.modal_req_pay}</label>
              <select value={form.purchase_type} onChange={e => setForm({...form, purchase_type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue">
                <option value="efectivo">{l.pay_cash}</option>
                <option value="credito_otorgado">{l.pay_cred}</option>
                <option value="financiamiento_dueno">{l.pay_own}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors">{l.btn_cancel}</button>
            <button type="submit" className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-nexus-blue text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">{l.btn_save_search}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
