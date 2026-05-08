"use client";

/* ═══════════════════════════════════════════════════════════════
   PropertyStatusBadge — Visual status indicator for property lifecycle
   ═══════════════════════════════════════════════════════════════ */

const STATUS_CONFIG = {
  draft: {
    label_es: 'Borrador',
    label_en: 'Draft',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    dot: 'bg-gray-400',
    icon: '📝',
  },
  pending_approval: {
    label_es: 'Pendiente',
    label_en: 'Pending',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-400',
    icon: '🟡',
  },
  needs_changes: {
    label_es: 'Necesita Cambios',
    label_en: 'Needs Changes',
    color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
    icon: '🔴',
  },
  approved: {
    label_es: 'Aprobada',
    label_en: 'Approved',
    color: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
    icon: '✅',
  },
  published: {
    label_es: 'Publicada',
    label_en: 'Published',
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    dot: 'bg-blue-500',
    icon: '🔵',
  },
  sold: {
    label_es: 'Vendida',
    label_en: 'Sold',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: '🏆',
  },
  cancelled: {
    label_es: 'Cancelada',
    label_en: 'Cancelled',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    dot: 'bg-gray-500',
    icon: '⚫',
  },
};

export default function PropertyStatusBadge({ status, lang = 'es', size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const label = lang === 'en' ? config.label_en : config.label_es;

  const sizeClasses = size === 'lg'
    ? 'px-3 py-1.5 text-xs'
    : 'px-2 py-0.5 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${config.color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {label}
    </span>
  );
}

export { STATUS_CONFIG };
