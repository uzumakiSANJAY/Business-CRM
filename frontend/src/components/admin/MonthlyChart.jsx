import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatINR } from '../../utils/currency.js';
import { LoadingSpinner } from '../shared/LoadingSpinner.jsx';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-4 py-3 shadow-xl border border-slate-800">
      <p className="text-slate-400 text-xs font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-300 capitalize">{p.name}:</span>
          <span className="text-white font-semibold">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlyChart({ data, isLoading }) {
  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="card p-6">
      <h2 className="section-title mb-1">Monthly Collection Overview</h2>
      <p className="text-xs text-slate-400 mb-6">Last 6 months — billed vs collected</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
            tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Legend
            wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter', paddingTop: '16px' }}
            formatter={(val) => <span className="text-slate-600 capitalize">{val}</span>}
          />
          <Bar dataKey="billed"    name="Billed"    fill="#818cf8" radius={[6,6,0,0]} />
          <Bar dataKey="collected" name="Collected" fill="#34d399" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
