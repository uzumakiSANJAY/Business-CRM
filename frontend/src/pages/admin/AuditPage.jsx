import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { getAuditLogs } from '../../api/audit.api.js';
import { formatDate } from '../../utils/date.js';

const ACTION_STYLES = {
  CREATE:  'bg-emerald-100 text-emerald-700',
  UPDATE:  'bg-blue-100 text-blue-700',
  DELETE:  'bg-red-100 text-red-700',
  CONFIRM: 'bg-purple-100 text-purple-700',
  REJECT:  'bg-orange-100 text-orange-700',
  LOGIN:   'bg-slate-100 text-slate-600',
};

function getActionStyle(action = '') {
  const upper = action.toUpperCase();
  for (const [key, cls] of Object.entries(ACTION_STYLES)) {
    if (upper.includes(key)) return cls;
  }
  return 'bg-slate-100 text-slate-600';
}

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => getAuditLogs(page, 20),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <Layout title="Audit Log">
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="section-title">Activity Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">{total} total records</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Time</th>
                <th className="table-th">User</th>
                <th className="table-th">Action</th>
                <th className="table-th">Entity</th>
                <th className="table-th">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                : logs.length === 0
                ? <tr><td colSpan={5} className="py-14 text-center text-slate-400 text-sm">No audit records</td></tr>
                : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="table-td font-medium text-slate-700">{log.user_name || 'System'}</td>
                    <td className="table-td">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="table-td text-slate-500">
                      {log.entity_type && <span>{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</span>}
                    </td>
                    <td className="table-td text-xs text-slate-400 max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
