"use client";

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function LoginClient() {
  const { signIn, isAuthenticated, loading, error } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-400/3 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-slate-200/50 border border-white/60 p-10 text-center space-y-8">
          
          {/* Logo */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
              <Image  
                src="/assets/logo-altitud.png" 
                alt="RE/MAX Altitud" 
                className="h-8 object-contain"
                width={200}
                height={32}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-black italic text-slate-900 tracking-tight">ALTITUD HUB</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Central de Operaciones</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-red-500 mx-auto rounded-full"></div>

          {/* Welcome text */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-700">Bienvenido</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Inicia sesión con tu cuenta de correo de RE/MAX Altitud para acceder a tu panel.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 font-medium">
              <svg className="w-5 h-5 inline mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transform hover:scale-[1.02] active:scale-[0.98]"
            id="google-login-btn"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Iniciar con Google
          </button>

          <p className="text-[10px] text-slate-400 font-medium">
            Solo cuentas <span className="font-bold text-slate-500">@remax-altitud.cr</span> autorizadas
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 mt-6 font-medium">
          RE/MAX Altitud · Pérez Zeledón, Costa Rica
        </p>
      </div>
    </div>
  );
}
