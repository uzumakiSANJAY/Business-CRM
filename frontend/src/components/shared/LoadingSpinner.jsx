export function LoadingSpinner({ size = 'md' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sz} animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600`} />
    </div>
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-200 rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-3 bg-slate-200 rounded-full w-1/3 mb-4" />
      <div className="h-8 bg-slate-200 rounded-full w-2/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded-full w-1/4" />
    </div>
  );
}
