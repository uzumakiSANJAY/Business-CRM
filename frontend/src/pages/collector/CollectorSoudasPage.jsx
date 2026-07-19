import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, ShoppingBag } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { getSoudas, createSouda } from '../../api/soudas.api.js';
import { getVendors } from '../../api/vendors.api.js';
import { getItems } from '../../api/items.api.js';
import { getItemCompanies } from '../../api/itemCompanies.api.js';
import { getItemTypes } from '../../api/itemTypes.api.js';
import { getDalals } from '../../api/dalals.api.js';

const todayStr = new Date().toISOString().slice(0, 10);
const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/* ─── New Order Modal (date locked to today) ─── */
function NewOrderModal({ onClose, onSave, loading }) {
  const [vendorId, setVendorId]   = useState('');
  const [itemId, setItemId]       = useState('');
  const [companyId, setCompanyId] = useState('');
  const [typeId, setTypeId]       = useState('');
  const [location, setLocation]   = useState('');
  const [qty, setQty]             = useState('');
  const [rate, setRate]           = useState('');
  const [dalalId, setDalalId]     = useState('');
  const [notes, setNotes]         = useState('');

  const { data: vendors = [] }   = useQuery({ queryKey: ['vendors'],                    queryFn: getVendors });
  const { data: items = [] }     = useQuery({ queryKey: ['items'],                      queryFn: getItems });
  const { data: companies = [] } = useQuery({ queryKey: ['item-companies', itemId],     queryFn: () => getItemCompanies(itemId),   enabled: !!itemId });
  const { data: types = [] }     = useQuery({ queryKey: ['item-types', companyId],      queryFn: () => getItemTypes(companyId),    enabled: !!companyId });
  const { data: dalals = [] }    = useQuery({ queryKey: ['dalals'],                     queryFn: getDalals });

  // Auto-fill location from vendor's route
  useEffect(() => {
    if (vendorId) {
      const v = vendors.find((v) => String(v.id) === vendorId);
      if (v?.route) setLocation(v.route);
    }
  }, [vendorId, vendors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      order_date: todayStr,
      vendor_id: parseInt(vendorId),
      item_id: parseInt(itemId),
      item_company_id: companyId ? parseInt(companyId) : null,
      item_type_id: typeId ? parseInt(typeId) : null,
      qty_ordered: parseFloat(qty),
      rate: parseFloat(rate),
      location: location || null,
      dalal_id: dalalId ? parseInt(dalalId) : null,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">New Order (Souda)</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Date locked to today */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date (Today only)</label>
            <input
              value={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Party */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Party (Vendor) *</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select party...</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {/* Item → Company → Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Item *</label>
              <select value={itemId} onChange={(e) => { setItemId(e.target.value); setCompanyId(''); setTypeId(''); }} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
              <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setTypeId(''); }} disabled={!itemId}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">None</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type / Pack</label>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)} disabled={!companyId}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">None</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Route / delivery location"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Qty + Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Qty Ordered *</label>
              <input type="number" step="0.01" min="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required placeholder="e.g. 100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rate *</label>
              <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} required placeholder="e.g. 1655"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Dalal + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dalal (Agent)</label>
              <select value={dalalId} onChange={(e) => setDalalId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">None</option>
                {dalals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />} Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function CollectorSoudasPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: soudas = [], isLoading } = useQuery({ queryKey: ['soudas'], queryFn: getSoudas });

  // Show only today's orders
  const todaySoudas = soudas.filter((s) => s.order_date?.slice(0, 10) === todayStr);

  const createMutation = useMutation({
    mutationFn: createSouda,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soudas'] }); setShowModal(false); },
  });

  const totalQty     = todaySoudas.reduce((s, o) => s + parseFloat(o.qty_ordered || 0), 0);
  const pendingCount = todaySoudas.filter((s) => parseFloat(s.balance || 0) > 0).length;

  return (
    <Layout title="Soudas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Today's Orders</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm">
            <Plus size={15} /> New Order
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Today's Orders", value: todaySoudas.length, color: 'text-slate-900' },
            { label: 'Total Qty',      value: totalQty.toLocaleString('en-IN'), color: 'text-emerald-700' },
            { label: 'Pending Del',    value: pendingCount, color: pendingCount > 0 ? 'text-red-500' : 'text-slate-900' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
          ) : todaySoudas.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm">No orders for today yet.</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                + Add first order
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="table-th text-left">Party</th>
                    <th className="table-th text-left">Item</th>
                    <th className="table-th text-right">Qty</th>
                    <th className="table-th text-right">Rate</th>
                    <th className="table-th text-left">Location</th>
                    <th className="table-th text-left">Dalal</th>
                    <th className="table-th text-right">Balance</th>
                    <th className="table-th text-left">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {todaySoudas.map((s) => {
                    const bal = parseFloat(s.balance || 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="table-td font-medium text-slate-800 whitespace-nowrap">{s.vendor_name}</td>
                        <td className="table-td">
                          <div className="font-medium text-slate-700">{s.item_name}</div>
                          {s.item_company_name && <div className="text-xs text-slate-400">{s.item_company_name}</div>}
                          {s.item_type_name && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-600 font-medium">
                              {s.item_type_name}
                            </span>
                          )}
                        </td>
                        <td className="table-td text-right font-mono">{fmt(s.qty_ordered)}</td>
                        <td className="table-td text-right font-mono">{fmt(s.rate)}</td>
                        <td className="table-td text-slate-500 whitespace-nowrap">{s.location || '—'}</td>
                        <td className="table-td text-slate-500 whitespace-nowrap">{s.dalal_name || '—'}</td>
                        <td className={`table-td text-right font-mono font-semibold ${bal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {fmt(bal)}
                        </td>
                        <td className="table-td text-slate-500 text-xs whitespace-nowrap">{s.created_by_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewOrderModal
          onClose={() => setShowModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}
    </Layout>
  );
}
