"use client";

import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   SOLD CONGRATS MODAL
   Celebration overlay when a property is marked as sold.
   Shows confetti, commission breakdown, and updates the agent's
   progress in the pipeline.
   ═══════════════════════════════════════════════════════════════ */

// Simple confetti particle system
function ConfettiCanvas({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.1,
        drift: (Math.random() - 0.5) * 1,
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      let alive = false;

      particles.forEach(p => {
        if (p.y > canvas.height + 50) return;
        alive = true;
        p.y += p.speed;
        p.x += p.drift;
        p.angle += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - (p.y / canvas.height) * 0.5);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (alive && frame < 300) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

export default function SoldCongratsModal({
  isOpen,
  onClose,
  propertyTitle,
  agentAmount,
  officeAmount,
  grossCommission,
  closingDate,
  buyerName,
  lang = 'es',
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [countUp, setCountUp] = useState(0);

  useEffect(() => {
    if (isOpen) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowConfetti(true);
      // Animate the agent amount counting up
      const target = agentAmount || 0;
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current = Math.min(current + increment, target);
        setCountUp(Math.round(current));
        if (step >= steps) clearInterval(timer);
      }, duration / steps);

      // Stop confetti after 5 seconds
      const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);

      return () => {
        clearInterval(timer);
        clearTimeout(confettiTimer);
      };
    }
  }, [isOpen, agentAmount]);

  if (!isOpen) return null;

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <>
      <ConfettiCanvas active={showConfetti} />

      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-bounce-in">

          {/* Hero */}
          <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 text-center text-white relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10" />

            <div className="relative z-10">
              <p className="text-5xl mb-3">🎉</p>
              <h2 className="text-3xl font-black uppercase tracking-tight mb-1">
                {t('auto_congratulations')}
              </h2>
              <p className="text-emerald-100 text-sm font-medium">
                {t('auto_property_sold_successfully')}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Property */}
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {t('auto_property')}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {propertyTitle || (t('auto_property'))}
              </p>
              {buyerName && (
                <p className="text-xs text-slate-500 mt-1">
                  {t('auto_buyer')}: {buyerName}
                </p>
              )}
              {closingDate && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(closingDate + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-CR' : 'en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Agent Earnings — Big Number */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 text-center border border-emerald-200 dark:border-emerald-800">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">
                🏆 {t('auto_your_commission')}
              </p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums transition-all duration-300">
                {fmt(countUp)}
              </p>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {t('auto_gross_commission')}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {fmt(grossCommission)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
                  🏢 {t('auto_office')}
                </p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {fmt(officeAmount)}
                </p>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-xl"
            >
              {t('auto_awesome_back_to_dashboard')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}
