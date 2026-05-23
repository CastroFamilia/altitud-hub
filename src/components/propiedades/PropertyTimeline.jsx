"use client";

/* ═══════════════════════════════════════════
   PROPERTY TIMELINE — Agent-facing stepper
   Shows the property's journey through all
   10 listing lifecycle stages.
   ═══════════════════════════════════════════ */

const STAGES = [
  { key: 'contact_created_at', labelKey: 'lpt_stage_contact', icon: '👤', color: 'indigo' },
  { key: 'prelisting_at', labelKey: 'lpt_stage_prelisting', icon: '📋', color: 'violet' },
  { key: 'cma_created_at', labelKey: 'lpt_stage_cma', icon: '📊', color: 'blue' },
  { key: 'listing_created_at', labelKey: 'lpt_stage_listing', icon: '🏠', color: 'cyan' },
  { key: 'photos_requested_at', labelKey: 'lpt_stage_photos_req', icon: '📸', color: 'amber' },
  { key: 'photos_ready_at', labelKey: 'lpt_stage_photos_ready', icon: '✅', color: 'emerald' },
  { key: 'authorization_signed_at', labelKey: 'lpt_stage_auth', icon: '✍️', color: 'teal' },
  { key: 'submitted_at', labelKey: 'lpt_stage_submitted', icon: '📤', color: 'orange' },
  { key: 'broker_approved_at', labelKey: 'lpt_stage_approved', icon: '🔎', color: 'green' },
  { key: 'published_at', labelKey: 'lpt_stage_published', icon: '🚀', color: 'brand' },
];

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.max(0, Math.round((new Date(d2) - new Date(d1)) / 86400000));
}

function formatDate(d, lang) {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleDateString(t('auto_en_us'), { month: 'short', day: 'numeric' });
}

export default function PropertyTimeline({ milestones, t, lang }) {
  if (!milestones) {
    return (
      <div className="glass-panel rounded-2xl p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <span>⏱️</span> {t('lpt_timeline_title')}
        </h3>
        <div className="text-center py-4 text-xs text-gray-400 italic">{t('lpt_no_data')}</div>
      </div>
    );
  }

  // Find the current active stage index
  let currentIdx = -1;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (milestones[STAGES[i].key]) { currentIdx = i; break; }
  }

  // Total elapsed
  const firstDate = milestones.contact_created_at || milestones.listing_created_at;
  const lastDate = milestones.published_at;
  const totalDays = daysBetween(firstDate, lastDate || new Date().toISOString());

  return (
    <div className="glass-panel rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span>⏱️</span> {t('lpt_timeline_title')}
        </h3>
        {totalDays !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">{t('lpt_total_elapsed')}</span>
            <span className={`text-sm font-black tabular-nums px-2 py-0.5 rounded-lg ${
              lastDate ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                       : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              {totalDays} {t('lpt_days')}
            </span>
          </div>
        )}
      </div>

      {/* Horizontal timeline stepper */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-[700px]">
          {STAGES.map((stage, idx) => {
            const date = milestones[stage.key];
            const isCompleted = !!date;
            const isCurrent = idx === currentIdx && !milestones.published_at;
            const isFuture = idx > currentIdx;
            const prevDate = idx > 0 ? milestones[STAGES[idx - 1].key] : null;
            const delta = daysBetween(prevDate, date);

            return (
              <div key={stage.key} className="flex items-start flex-1 min-w-0">
                {/* Node + Label */}
                <div className="flex flex-col items-center relative" style={{ minWidth: 60 }}>
                  {/* Connector line (left) */}
                  {idx > 0 && (
                    <div className={`absolute top-4 right-1/2 h-0.5 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-dark-border'}`}
                      style={{ width: 'calc(100% + 100%)', transform: 'translateX(-50%)' }} />
                  )}

                  {/* Circle */}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : isCurrent
                        ? 'bg-brand-500 text-white shadow-brand-500/30 animate-pulse ring-4 ring-brand-500/20'
                        : 'bg-gray-100 dark:bg-dark-border text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600'
                  }`}>
                    {isCompleted ? '✓' : stage.icon}
                  </div>

                  {/* Label */}
                  <p className={`text-[8px] md:text-[9px] font-bold text-center mt-1.5 leading-tight max-w-[65px] ${
                    isCompleted ? 'text-emerald-600 dark:text-emerald-400'
                      : isCurrent ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {t(stage.labelKey)}
                  </p>

                  {/* Date */}
                  {date && (
                    <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                      {formatDate(date, lang)}
                    </p>
                  )}

                  {/* Delta badge */}
                  {delta !== null && delta > 0 && (
                    <span className={`text-[7px] font-black mt-0.5 px-1 py-0.5 rounded ${
                      delta > 7 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : delta > 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      +{delta}d
                    </span>
                  )}

                  {/* Current stage indicator */}
                  {isCurrent && (
                    <span className="text-[7px] font-black uppercase tracking-wider mt-1 text-brand-500">
                      {t('lpt_in_progress')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status summary */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">{t('lpt_completed')} ({currentIdx + 1}/{STAGES.length})</span>
        </div>
        {!milestones.published_at && currentIdx >= 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-[9px] text-brand-600 dark:text-brand-400 font-medium">{t('lpt_in_progress')}: {t(STAGES[currentIdx].labelKey)}</span>
          </div>
        )}
        {milestones.published_at && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🎉</span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">{t('lpt_completed')}!</span>
          </div>
        )}
      </div>
    </div>
  );
}
