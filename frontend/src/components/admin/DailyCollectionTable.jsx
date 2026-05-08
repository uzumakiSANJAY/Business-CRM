import { formatDate } from '../../utils/date.js';
import { formatINR } from '../../utils/currency.js';
import { LoadingSpinner } from '../shared/LoadingSpinner.jsx';
import { Calendar } from 'lucide-react';

export default function DailyCollectionTable({ data, isLoading }) {
  if (isLoading) return <LoadingSpinner />;

  const recent = (data || []).slice(0, 10);

  return (
    <div className="card overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-indigo-500" />
        <h2 className="section-title text-sm">Daily Collections</h2>
      </div>
      {recent.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">No data yet</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {recent.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-600">{formatDate(row.date)}</span>
              <span className="text-sm font-semibold text-slate-800">{formatINR(row.collected)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
