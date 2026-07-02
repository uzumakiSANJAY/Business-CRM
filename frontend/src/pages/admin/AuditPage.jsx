import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, IndianRupee, Users, ClipboardList } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { getAuditLogs } from '../../api/audit.api.js';
import { getCollections } from '../../api/collections.api.js';
import { getCollectors } from '../../api/collectors.api.js';
import { getVendors } from '../../api/vendors.api.js';
import { getRoutes } from '../../api/routes.api.js';
import { formatDate } from '../../utils/date.js';

const STATUS_STYLES = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
  REJECTED:  'bg-red-100 text-red-700',
};

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

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

// ─── Collections Report Tab ──────────────────────────────────────────────────
function CollectionsReport() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ from_date: '', to_date: '', collector_id: '', status: '', route: '', vendor_id: '' });
  const [applied, setApplied] = useState({});

  const { data: collectors = [] } = useQuery({ queryKey: ['collectors'], queryFn: getCollectors });
  const { data: allVendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });

  // When route changes, narrow vendor list and reset vendor selection
  // API already returns only active vendors (WHERE is_active = true), no need to re-filter
  const filteredVendors = filters.route
    ? allVendors.filter(v => v.route === filters.route)
    : allVendors;

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections-report', applied],
    queryFn: () => getCollections(applied),
  });

  const confirmedTotal  = collections.filter(c => c.status === 'CONFIRMED').reduce((s, c) => s + parseFloat(c.amount), 0);
  const pendingTotal    = collections.filter(c => c.status === 'PENDING').reduce((s, c) => s + parseFloat(c.amount), 0);

  // Group by collector for summary
  const byCollector = {};
  collections.filter(c => c.status === 'CONFIRMED').forEach(c => {
    const name = c.collector_name || 'Unknown';
    byCollector[name] = (byCollector[name] || 0) + parseFloat(c.amount);
  });

  const applyFilters = () => setApplied({ ...filters });
  const clearFilters = () => { setFilters({ from_date: '', to_date: '', collector_id: '', status: '', route: '', vendor_id: '' }); setApplied({}); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">From Date</label>
            <input type="date" value={filters.from_date} max={today}
              onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">To Date</label>
            <input type="date" value={filters.to_date} max={today}
              onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Route</label>
            <select value={filters.route}
              onChange={e => setFilters(f => ({ ...f, route: e.target.value, vendor_id: '' }))}
              className="input-field text-sm">
              <option value="">All Routes</option>
              {routes.filter(r => r.is_active).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Vendor</label>
            <select value={filters.vendor_id}
              onChange={e => setFilters(f => ({ ...f, vendor_id: e.target.value }))}
              className="input-field text-sm">
              <option value="">All Vendors</option>
              {filteredVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Collector</label>
            <select value={filters.collector_id}
              onChange={e => setFilters(f => ({ ...f, collector_id: e.target.value }))}
              className="input-field text-sm">
              <option value="">All Collectors</option>
              {collectors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="input-field text-sm">
              <option value="">All Status</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={applyFilters} className="btn-primary py-2 px-5 text-sm">Apply</button>
          <button onClick={clearFilters} className="btn-secondary py-2 px-5 text-sm">Clear</button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50"><IndianRupee className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Confirmed Collected</p>
            <p className="text-lg font-bold text-slate-800">{fmt(confirmedTotal)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-50"><ClipboardList className="h-5 w-5 text-yellow-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Pending Approval</p>
            <p className="text-lg font-bold text-slate-800">{fmt(pendingTotal)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50"><Users className="h-5 w-5 text-indigo-600" /></div>
          <div>
            <p className="text-xs text-slate-500">Total Records</p>
            <p className="text-lg font-bold text-slate-800">{collections.length}</p>
          </div>
        </div>
      </div>

      {/* By collector breakdown */}
      {Object.keys(byCollector).length > 1 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Confirmed by Collector</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byCollector).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
              <div key={name} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <span className="text-sm font-bold text-emerald-600">{fmt(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="section-title">Collection Records</h2>
          <span className="text-xs text-slate-400">{collections.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Collector</th>
                <th className="table-th">Vendor</th>
                <th className="table-th">Route</th>
                <th className="table-th text-right">Amount</th>
                <th className="table-th">Mode</th>
                <th className="table-th">Status</th>
                <th className="table-th">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : collections.length === 0
                ? <tr><td colSpan={8} className="py-14 text-center text-slate-400 text-sm">No records found</td></tr>
                : collections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td text-sm whitespace-nowrap">{formatDate(c.collection_date)}</td>
                    <td className="table-td font-medium text-slate-700">{c.collector_name}</td>
                    <td className="table-td text-slate-700">{c.vendor_name}</td>
                    <td className="table-td text-slate-400 text-xs">{c.vendor_route || '—'}</td>
                    <td className="table-td text-right font-semibold text-slate-800">{fmt(c.amount)}</td>
                    <td className="table-td text-xs">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c.payment_mode || 'CASH'}</span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="table-td text-xs text-slate-400 max-w-[160px] truncate" title={c.notes}>{c.notes || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
            {!isLoading && collections.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="table-td font-semibold text-slate-600">Total Confirmed</td>
                  <td className="table-td text-right font-bold text-emerald-700">{fmt(confirmedTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Log Tab ────────────────────────────────────────────────────────
function ActivityLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => getAuditLogs(page, 20),
  });

  const logs = data?.audit_logs || data?.logs || [];
  const total = data?.pagination?.total || data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
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
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [tab, setTab] = useState('collections');

  return (
    <Layout title="Audit Log">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'collections', label: 'Collections Report' },
          { key: 'activity',    label: 'Activity Log' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'collections' ? <CollectionsReport /> : <ActivityLog />}
    </Layout>
  );
}
