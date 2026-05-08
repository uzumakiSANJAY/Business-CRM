import AlertBadge from '../shared/AlertBadge.jsx';
import { formatINR } from '../../utils/currency.js';
import { SkeletonRow } from '../shared/LoadingSpinner.jsx';

export default function VendorOutstandingTable({ data, isLoading }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="section-title">Vendor Outstanding</h2>
        <p className="text-xs text-slate-400 mt-0.5">All active vendors with unpaid bills</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Vendor</th>
              <th className="table-th text-right">Bill Amount</th>
              <th className="table-th text-right">Outstanding</th>
              <th className="table-th">Status</th>
              <th className="table-th text-right">Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              : (data || []).length === 0
              ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    No outstanding bills
                  </td>
                </tr>
              )
              : (data || []).map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="table-td font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {v.name}
                  </td>
                  <td className="table-td text-right">{formatINR(v.billed)}</td>
                  <td className="table-td text-right font-semibold text-rose-600">{formatINR(v.outstanding)}</td>
                  <td className="table-td"><AlertBadge flag={v.alert_flag} /></td>
                  <td className="table-td text-right text-slate-500">{v.days_pending ?? '-'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
