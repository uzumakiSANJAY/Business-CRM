const CONFIGS = {
  DONE: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Paid',      ring: '' },
  OK:   { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400',   label: 'On Time',   ring: '' },
  WARN: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Follow Up', ring: 'animate-pulse' },
  CRIT: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Urgent',    ring: 'animate-ping-slow' },
};

export default function AlertBadge({ flag }) {
  const cfg = CONFIGS[flag] || CONFIGS.OK;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className="relative flex h-2 w-2">
        {(flag === 'CRIT' || flag === 'WARN') && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot} ${cfg.ring}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
      </span>
      {cfg.label}
    </span>
  );
}
