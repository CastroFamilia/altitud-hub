"use client";

import { useState } from 'react';
import { useApp } from '@/lib/context';
import TopNav from '@/components/layout/TopNav';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PerfilClient({ initialProfile }) {
  const { t } = useApp();
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    phone: profile.phone || '',
    bio_es: profile.bio_es || '',
    bio_en: profile.bio_en || '',
    video_url: profile.video_url || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          ...formData
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al guardar perfil');
      }

      setProfile(data.profile);
      triggerToast('Perfil actualizado con éxito', 'success');
      router.refresh();
    } catch (err) {
      console.error(err);
      triggerToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopNav title="Mi Perfil Web" subtitle="Configura tu presentación para el sitio público" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[999] animate-fade-in-up">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
            toast.type === 'error' 
              ? 'bg-red-500/90 border-red-400 text-white shadow-red-500/20' 
              : 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/20'
          }`}>
            <span>{toast.type === 'error' ? '❌' : '✅'}</span>
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-0 bg-slate-50 dark:bg-dark-bg">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0">
              <Image 
                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=5a82bf&color=fff`} 
                alt="Avatar" 
                layout="fill"
                objectFit="cover"
                className="rounded-full shadow-lg border-4 border-white dark:border-slate-800"
              />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">{profile.full_name}</h2>
              <p className="text-sm text-nexus-blue font-bold uppercase tracking-widest mt-1">
                {profile.role === 'broker' ? 'Broker' : profile.role === 'team_leader' ? 'Team Leader' : 'Agente Asociado'}
              </p>
              <p className="text-xs text-slate-500 mt-2">{profile.email}</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 md:p-8">
            <h3 className="text-lg font-black italic text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-nexus-blue">🌐</span> Perfil Web Público
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Nombre Público</label>
                <input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue focus:border-transparent transition-all"
                  placeholder="Ej. Alejandra Castro"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Teléfono / WhatsApp</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue focus:border-transparent transition-all"
                  placeholder="+506 8888 8888"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Video de Presentación (URL)</label>
                <input 
                  type="url" 
                  name="video_url"
                  value={formData.video_url}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue focus:border-transparent transition-all"
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-[10px] text-slate-400 mt-1">Enlace a YouTube, Vimeo o similar para mostrar en tu perfil público.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Biografía (Español)</label>
                <textarea 
                  name="bio_es"
                  value={formData.bio_es}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue focus:border-transparent transition-all"
                  placeholder="Escribe tu biografía en español..."
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Biografía (Inglés)</label>
                <textarea 
                  name="bio_en"
                  value={formData.bio_en}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-nexus-blue focus:border-transparent transition-all"
                  placeholder="Write your bio in English..."
                ></textarea>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-nexus-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60 flex items-center gap-2 active:scale-95"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Guardar Perfil
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
