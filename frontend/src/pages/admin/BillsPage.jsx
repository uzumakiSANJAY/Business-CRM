import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, XCircle, ChevronDown } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getBills, cancelBill } from '../../api/bills.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';

const STATUS_STYLES = {
  ACTIVE:    'bg-indigo-100 text-indigo-700',
  PAID:      'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

export default function BillsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);

  const { data: bills = [], isLoading } = useQuery({ queryKey: ['bills'], queryFn: getBills });

  const cancelMutation = useMutation({
    mutationFn: cancelBill,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast('Bill cancelled', 'success'); setCancelTarget(null); },
    onError: () => toast('Error cancelling bill', 'error'),
  });

  const filtered = bills.filter((b) => {
    const matchSearch = b.vendor_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Layout title="Bills">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field pr-10 appearance-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">Vendor</th>
                <th className="table-th text-right">Amount</th>
                <th className="table-th">Bill Date</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Outstanding</th>
                <th className="table-th">Alert</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : filtered.length === 0
                ? <tr><td colSpan={8} className="py-14 text-center text-slate-400 text-sm">No bills found</td></tr>
                : filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td text-slate-400 font-mono text-xs">#{b.id}</td>
                    <td className="table-td font-semibold text-slate-800">{b.vendor_name}</td>
                    <td className="table-td text-right font-semibold">{formatINR(b.amount)}</td>
                    <td className="table-td text-slate-500">{formatDate(b.generated_date)}</td>
                    <td className="table-td">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[b.status]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      {b.status === 'ACTIVE'
                        ? <span className="font-semibold text-rose-600">{formatINR(b.outstanding)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="table-td">
                      {b.status === 'ACTIVE' ? <AlertBadge flag={b.alert_flag} /> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="table-td text-center">
                      {b.status === 'ACTIVE' && (
                        <button
                          onClick={() => setCancelTarget(b)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Cancel bill"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Bill"
        message={`Cancel bill #${cancelTarget?.id} for ${cancelTarget?.vendor_name}? This cannot be undone.`}
        onConfirm={() => cancelMutation.mutate(cancelTarget?.id)}
        onCancel={() => setCancelTarget(null)}
      />
    </Layout>
  );
}
