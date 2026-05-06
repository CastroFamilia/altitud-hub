"use client";

/* ═══════════════════════════════════════════════════════════════
   DevelopmentStatusBadge — Reusable badge for development status
   Mirrors PropertyStatusBadge pattern with development-specific statuses.
   ═══════════════════════════════════════════════════════════════ */

const STATUS_MAP = {
  draft:            { key: 'dev_status_draft',         bg: 'bg-gray-500/15 text-gray-500 dark:text-gray-400',    dot: 'bg-gray-400' },
  pending_approval: { key: 'dev_status_pending',       bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' },
  needs_changes:    { key: 'dev_status_needs_changes',  bg: 'bg-red-500/15 text-red-600 dark:text-red-400',       dot: 'bg-red-400' },
  active:           { key: 'dev_status_active',         bg: 'bg-green-500/15 text-green-600 dark:text-green-400', dot: 'bg-green-400' },
  sold_out:         { key: 'dev_status_sold_out',       bg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400', dot: 'bg-purple-400' },
  archived:         { key: 'dev_status_archived',       bg: 'bg-slate-500/15 text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
  lg: 'px-3 py-1.5 text-xs',
};

export default function DevelopmentStatusBadge({ status, t, size = 'md' }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${s.bg} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {t(s.key)}
    </span>
  );
}

export { STATUS_MAP };
