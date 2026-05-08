import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { getVendors } from '../../api/vendors.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';
import { daysDiff } from '../../utils/date.js';

export default function CollectorVendorsPage() {
  const [search, setSearch] = useState('');
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });

  const filtered = vendors
    .filter((v) => v.active_bill)
    .filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout title="Vendor Bills">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
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
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <p className="text-slate-400 text-sm">No active vendor bills</p>
                    </td>
                  </tr>
                )
                : filtered.map((v) => {
                  const days = v.active_bill ? daysDiff(v.active_bill.generated_date) : 0;
                  return (
                    <tr key={v.id} className={`transition-colors hover:bg-slate-50 ${v.alert_flag === 'CRIT' ? 'border-l-4 border-l-red-400' : v.alert_flag === 'WARN' ? 'border-l-4 border-l-amber-400' : ''}`}>
                      <td className="table-td">
                        <p className="font-semibold text-slate-800">{v.name}</p>
                        {v.address && <p className="text-xs text-slate-400 mt-0.5">{v.address}</p>}
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
