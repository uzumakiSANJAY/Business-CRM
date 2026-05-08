import { IndianRupee, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatINR } from '../../utils/currency.js';
import { SkeletonCard } from '../shared/LoadingSpinner.jsx';

const cards = [
  {
    key: 'total_billed_month',
    label: 'Total Billed (Month)',
    icon: IndianRupee,
    gradient: 'from-indigo-500 to-purple-600',
    shadow: 'shadow-indigo-500/25',
    iconBg: 'bg-white/20',
  },
  {
    key: 'total_collected_month',
    label: 'Total Collected (Month)',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-500/25',
    iconBg: 'bg-white/20',
  },
  {
    key: 'total_outstanding',
    label: 'Total Outstanding',
    icon: TrendingDown,
    gradient: 'from-orange-500 to-red-500',
    shadow: 'shadow-orange-500/25',
    iconBg: 'bg-white/20',
  },
  {
    key: 'alerts',
    label: 'Active Alerts',
    icon: AlertTriangle,
    gradient: 'from-rose-500 to-pink-600',
    shadow: 'shadow-rose-500/25',
    iconBg: 'bg-white/20',
    isAlerts: true,
  },
];

export default function KPICards({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[1,2,3,4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {cards.map(({ key, label, icon: Icon, gradient, shadow, iconBg, isAlerts }) => (
        <div
          key={key}
          className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} shadow-lg ${shadow} text-white`}
        >
          {/* Background decoration */}
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between mb-4">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <div className={`p-2 rounded-xl ${iconBg}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="relative">
            {isAlerts ? (
              <>
                <p className="text-3xl font-bold">
                  {(stats?.active_alerts?.crit ?? 0) + (stats?.active_alerts?.warn ?? 0)}
                </p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs font-medium text-white/80">
                    {stats?.active_alerts?.crit ?? 0} Critical
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-xs font-medium text-white/80">
                    {stats?.active_alerts?.warn ?? 0} Warning
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">{formatINR(stats?.[key])}</p>
                <p className="text-xs text-white/70 mt-1">As of today</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
