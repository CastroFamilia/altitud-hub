"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import TopNav from '@/components/layout/TopNav';
import Image from 'next/image';

export default function AdminPrintablesClient({ initialPages = [], user }) {
  const [pages, setPages] = useState(initialPages);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return alert("Por favor ingresa un título y selecciona un archivo");

    setIsUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `pages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('printables')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('printables')
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      const newPage = {
        title: uploadTitle,
        image_url: imageUrl,
        order_index: pages.length,
        is_active: true
      };

      const { data, error: insertError } = await supabase
        .from('printable_pages')
        .insert([newPage])
        .select()
        .single();

      if (insertError) throw insertError;

      setPages([...pages, data]);
      setUploadTitle('');
      setUploadFile(null);
      e.target.reset();
      
    } catch (error) {
      console.error(error);
      alert("Error subiendo el archivo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id, imageUrl) => {
    if (!confirm('¿Seguro que deseas eliminar esta página?')) return;
    
    try {
      // Opt: Delete from storage
      const filePath = imageUrl.split('/').pop();
      if (filePath) {
        await supabase.storage.from('printables').remove([`pages/${filePath}`]);
      }

      await supabase.from('printable_pages').delete().eq('id', id);
      setPages(pages.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Error eliminando: " + e.message);
    }
  };

  return (
    <>
      <TopNav title="Administrar Páginas de Prelisting" subtitle="Sube las páginas que los agentes podrán elegir en su Carpeta Prelisting" />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="bg-white dark:bg-dark-panel p-6 rounded-xl border border-gray-100 dark:border-dark-border shadow-sm">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Subir Nueva Página (Imagen)</h2>
            <form onSubmit={handleUpload} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Título de la Página</label>
                <input 
                  type="text" 
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-input text-gray-900 dark:text-white text-sm"
                  placeholder="Ej. Estrategia de Marketing"
                  required
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Archivo de Imagen (A4 / Letter)</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-500/20 dark:file:text-brand-300 dark:hover:file:bg-brand-500/30"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isUploading}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Subiendo...' : 'Subir Página'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {pages.map(p => (
              <div key={p.id} className="bg-white dark:bg-dark-panel rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border shadow-sm group">
                <div className="relative aspect-[1/1.4] w-full bg-gray-100 dark:bg-dark-input">
                  <Image src={p.image_url} alt={p.title} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate pr-2">{p.title}</h3>
                  <button 
                    onClick={() => handleDelete(p.id, p.image_url)}
                    className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {pages.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-dark-border rounded-xl">
                No has subido ninguna página aún.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
