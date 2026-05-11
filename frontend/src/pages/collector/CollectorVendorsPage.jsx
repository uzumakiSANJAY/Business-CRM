import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Navigation } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { getVendors } from '../../api/vendors.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate, daysDiff } from '../../utils/date.js';

export default function CollectorVendorsPage() {
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });

  const activeVendors = vendors.filter((v) => v.active_bill);
  const routes = [...new Set(activeVendors.map((v) => v.route).filter(Boolean))].sort();

  const filtered = activeVendors.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchRoute = !routeFilter || v.route === routeFilter;
    return matchSearch && matchRoute;
  });

  return (
    <Layout title="Vendor Bills">
      <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        {routes.length > 0 && (
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Routes</option>
            {routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-medium">
          {filtered.filter((v) => v.alert_flag === 'CRIT').length} Urgent ·{' '}
          {filtered.filter((v) => v.alert_flag === 'WARN').length} Follow-up
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Vendor</th>
                <th className="table-th">Route</th>
                <th className="table-th">Contact</th>
                <th className="table-th text-right">Bill Amount</th>
                <th className="table-th text-right">Outstanding</th>
                <th className="table-th">Bill Date</th>
                <th className="table-th text-right">Days Pending</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <p className="text-slate-400 text-sm">No active vendor bills</p>
                    </td>
                  </tr>
                )
                : filtered.map((v) => {
                  const days = v.active_bill ? daysDiff(v.active_bill.generated_date) : 0;
                  const mapsUrl = v.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`
                    : null;
                  return (
                    <tr key={v.id} className={`transition-colors hover:bg-slate-50 ${v.alert_flag === 'CRIT' ? 'border-l-4 border-l-red-400' : v.alert_flag === 'WARN' ? 'border-l-4 border-l-amber-400' : ''}`}>
                      <td className="table-td">
                        <p className="font-semibold text-slate-800">{v.name}</p>
                        {v.address && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{v.address}</p>}
                      </td>
                      <td className="table-td">
                        {v.route ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700">{v.route}</span>
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Navigate"
                                className="ml-1 p-1 rounded-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                              >
                                <Navigation className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="table-td text-slate-500">{v.contact_person || '—'}</td>
                      <td className="table-td text-right font-semibold">{formatINR(v.active_bill?.amount)}</td>
                      <td className="table-td text-right">
                        <span className="font-bold text-rose-600">{formatINR(v.outstanding)}</span>
                      </td>
                      <td className="table-td text-slate-500">{formatDate(v.active_bill?.generated_date)}</td>
                      <td className="table-td text-right">
                        <span className={`font-semibold ${days >= 15 ? 'text-red-600' : days >= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {days}d
                        </span>
                      </td>
                      <td className="table-td"><AlertBadge flag={v.alert_flag} /></td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
