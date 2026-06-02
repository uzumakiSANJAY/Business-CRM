import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Truck, X, PackageCheck, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Layout from '../../components/shared/Layout.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getSoudas, createSouda, updateSouda, deleteSouda, addDelivery, deleteDelivery } from '../../api/soudas.api.js';
import { getVendors } from '../../api/vendors.api.js';
import { getItems } from '../../api/items.api.js';
import { getDalals } from '../../api/dalals.api.js';
import { getRoutes } from '../../api/routes.api.js';
import { formatDate } from '../../utils/date.js';

// ─── Souda Form Modal ────────────────────────────────────────────────────────
function SoudaModal({ souda, vendors, items, dalals, routes, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!souda?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: souda
      ? {
          order_date: souda.order_date?.slice(0, 10),
          vendor_id: souda.vendor_id,
          item_id: souda.item_id,
          qty_ordered: souda.qty_ordered,
          rate: souda.rate,
          location: souda.location || '',
          dalal_id: souda.dalal_id || '',
          notes: souda.notes || '',
        }
      : { order_date: new Date().toISOString().slice(0, 10) },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        vendor_id: parseInt(data.vendor_id),
        item_id: parseInt(data.item_id),
        dalal_id: data.dalal_id ? parseInt(data.dalal_id) : null,
        qty_ordered: parseFloat(data.qty_ordered),
        rate: parseFloat(data.rate),
      };
      return isEdit ? updateSouda(souda.id, payload) : createSouda(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soudas'] });
      toast(isEdit ? 'Order updated' : 'Order created', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Order' : 'New Order (Souda)'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className={`input-field ${errors.order_date ? 'border-red-400' : ''}`}
                {...register('order_date', { required: 'Required' })} />
              {errors.order_date && <p className="text-red-500 text-xs mt-1">{errors.order_date.message}</p>}
            </div>
            <div>
              <label className="label">Party (Vendor) *</label>
              <select className={`input-field ${errors.vendor_id ? 'border-red-400' : ''}`}
                {...register('vendor_id', { required: 'Required' })}>
                <option value="">Select party...</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              {errors.vendor_id && <p className="text-red-500 text-xs mt-1">{errors.vendor_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Item *</label>
              <select className={`input-field ${errors.item_id ? 'border-red-400' : ''}`}
                {...register('item_id', { required: 'Required' })}>
                <option value="">Select item...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              {errors.item_id && <p className="text-red-500 text-xs mt-1">{errors.item_id.message}</p>}
            </div>
            <div>
              <label className="label">Location</label>
              <select className="input-field" {...register('location')}>
                <option value="">Select location...</option>
                {routes.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Qty Ordered *</label>
              <input type="number" step="0.01" className={`input-field ${errors.qty_ordered ? 'border-red-400' : ''}`}
                placeholder="e.g. 100"
                {...register('qty_ordered', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
              {errors.qty_ordered && <p className="text-red-500 text-xs mt-1">{errors.qty_ordered.message}</p>}
            </div>
            <div>
              <label className="label">Rate *</label>
              <input type="number" step="0.01" className={`input-field ${errors.rate ? 'border-red-400' : ''}`}
                placeholder="e.g. 1655"
                {...register('rate', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })} />
              {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dalal (Agent)</label>
              <select className="input-field" {...register('dalal_id')}>
                <option value="">None</option>
                {dalals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input-field" placeholder="Optional..." {...register('notes')} />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isEdit ? 'Save Changes' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Delivery Modal ────────────────────────────────────────────────────────
function DeliveryModal({ souda, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { delivery_date: new Date().toISOString().slice(0, 10) },
  });

  const mutation = useMutation({
    mutationFn: (data) => addDelivery(souda.id, { ...data, qty_delivered: parseFloat(data.qty_delivered) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soudas'] });
      toast('Delivery added', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  const balance = parseFloat(souda.balance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Add Delivery</h3>
            <p className="text-xs text-slate-500 mt-0.5">{souda.vendor_name} — {souda.item_name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="px-6 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex justify-between text-sm">
            <span className="text-amber-700">Balance remaining</span>
            <span className="font-bold text-amber-800">{balance} units</span>
          </div>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Delivery Date *</label>
            <input type="date" className={`input-field ${errors.delivery_date ? 'border-red-400' : ''}`}
              {...register('delivery_date', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">Qty Delivered *</label>
            <input type="number" step="0.01" className={`input-field ${errors.qty_delivered ? 'border-red-400' : ''}`}
              placeholder={`Max ${balance}`}
              {...register('qty_delivered', {
                required: 'Required',
                min: { value: 0.01, message: 'Must be > 0' },
                max: { value: balance, message: `Cannot exceed balance (${balance})` },
              })} />
            {errors.qty_delivered && <p className="text-red-500 text-xs mt-1">{errors.qty_delivered.message}</p>}
          </div>
          <div>
            <label className="label">Car Number</label>
            <input className="input-field" placeholder="e.g. RJ 14 GA 1234" {...register('car_number')}
              style={{ textTransform: 'uppercase' }} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input-field" placeholder="Optional..." {...register('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Add Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SoudasPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [modal, setModal]           = useState(null); // null | 'new' | souda-object
  const [deliveryModal, setDelivery] = useState(null);
  const [deleteTarget, setDelete]   = useState(null);
  const [search, setSearch]           = useState('');
  const [filterDalal, setFilterDalal] = useState('');
  const [filterRoute, setFilterRoute] = useState('');

  const { data: soudas = [], isLoading } = useQuery({ queryKey: ['soudas'], queryFn: () => getSoudas() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const { data: items = [] }   = useQuery({ queryKey: ['items'],   queryFn: getItems });
  const { data: dalals = [] }  = useQuery({ queryKey: ['dalals'],  queryFn: getDalals });
  const { data: routes = [] }  = useQuery({ queryKey: ['routes'],  queryFn: getRoutes });

  const deleteMutation = useMutation({
    mutationFn: deleteSouda,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soudas'] }); toast('Order deleted', 'success'); setDelete(null); },
    onError: () => toast('Error deleting order', 'error'),
  });

  const removeDelivery = useMutation({
    mutationFn: ({ soudaId, deliveryId }) => deleteDelivery(soudaId, deliveryId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soudas'] }); toast('Delivery removed', 'success'); },
    onError: () => toast('Error removing delivery', 'error'),
  });

  const filtered = soudas.filter((s) => {
    const matchSearch = !search || s.vendor_name?.toLowerCase().includes(search.toLowerCase())
      || s.item_name?.toLowerCase().includes(search.toLowerCase())
      || s.location?.toLowerCase().includes(search.toLowerCase());
    const matchDalal = !filterDalal || String(s.dalal_id) === filterDalal;
    const matchRoute = !filterRoute || s.location === filterRoute;
    return matchSearch && matchDalal && matchRoute;
  });

  const exportToExcel = () => {
    const maxDel = Math.max(...filtered.map((s) => s.deliveries.length), 0);

    const rows = filtered.map((s) => {
      const row = {
        Date:            s.order_date?.slice(0, 10),
        'Party Name':    s.vendor_name,
        Item:            s.item_name,
        'Qty (Ordered)': parseFloat(s.qty_ordered),
        Rate:            parseFloat(s.rate),
        Location:        s.location || '',
        Dalal:           s.dalal_name || '',
      };
      for (let i = 0; i < maxDel; i++) {
        const d = s.deliveries[i];
        row[`Del Date ${i + 1}`] = d ? d.delivery_date?.slice(0, 10) : '';
        row[`Del Qty ${i + 1}`]  = d ? parseFloat(d.qty_delivered) : '';
        row[`Del Car ${i + 1}`]  = d?.car_number || '';
      }
      row['Total Del'] = parseFloat(s.total_delivered);
      row['Balance']   = parseFloat(s.balance);
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const baseCols = [{ wch: 12 }, { wch: 24 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    const delCols  = Array.from({ length: maxDel * 3 }, () => ({ wch: 12 }));
    ws['!cols'] = [...baseCols, ...delCols, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soudas');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Soudas_${date}.xlsx`);
  };

  const totalOrdered  = filtered.reduce((a, s) => a + parseFloat(s.qty_ordered || 0), 0);
  const totalDelivered = filtered.reduce((a, s) => a + parseFloat(s.total_delivered || 0), 0);
  const totalBalance  = filtered.reduce((a, s) => a + parseFloat(s.balance || 0), 0);

  return (
    <Layout title="Soudas (Orders)">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Delivered</p>
          <p className="text-2xl font-bold text-emerald-600">{totalDelivered.toFixed(0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Balance</p>
          <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {totalBalance.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Search party, item, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-44" value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)}>
          <option value="">All Routes</option>
          {routes.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <select className="input-field w-44" value={filterDalal} onChange={(e) => setFilterDalal(e.target.value)}>
          <option value="">All Dalals</option>
          {dalals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button onClick={exportToExcel} className="btn-secondary whitespace-nowrap" title="Export to Excel">
          <Download className="h-4 w-4" /> Export
        </button>
        <button onClick={() => setModal('new')} className="btn-primary whitespace-nowrap">
          <Plus className="h-4 w-4" /> New Order
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Party</th>
                <th className="table-th">Item</th>
                <th className="table-th text-right">Qty</th>
                <th className="table-th text-right">Rate</th>
                <th className="table-th">Location</th>
                <th className="table-th">Dalal</th>
                <th className="table-th" style={{ background: '#e8f5e9', minWidth: '220px' }}>Deliveries</th>
                <th className="table-th text-right">Total Del</th>
                <th className="table-th text-right">Balance</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={16} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                            <PackageCheck className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-slate-400 text-sm">No orders yet. Click "New Order" to create one.</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((s) => {
                    const bal = parseFloat(s.balance);
                    const isPending = bal > 0;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors group align-top">
                        <td className="table-td text-slate-500 text-xs whitespace-nowrap">{formatDate(s.order_date)}</td>
                        <td className="table-td font-semibold text-slate-800">{s.vendor_name}</td>
                        <td className="table-td text-slate-700">{s.item_name}</td>
                        <td className="table-td text-right font-mono">{s.qty_ordered}</td>
                        <td className="table-td text-right font-mono text-slate-500">{s.rate}</td>
                        <td className="table-td text-slate-500 text-xs">{s.location || '—'}</td>
                        <td className="table-td text-slate-500 text-xs">{s.dalal_name || '—'}</td>

                        {/* Deliveries — unlimited */}
                        <td className="table-td" style={{ background: '#f1f8f1' }}>
                          {s.deliveries.length === 0 ? (
                            <span className="text-slate-400 text-xs">No deliveries yet</span>
                          ) : (
                            <div className="space-y-1">
                              {s.deliveries.map((d, i) => (
                                <div key={d.id} className="flex items-center gap-2 text-xs">
                                  <span className="w-4 text-slate-400 font-mono flex-shrink-0">{i + 1}.</span>
                                  <span className="text-slate-600 whitespace-nowrap">{formatDate(d.delivery_date)}</span>
                                  <span className="font-mono font-semibold text-emerald-700 w-12 text-right flex-shrink-0">{d.qty_delivered}</span>
                                  {d.car_number && (
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-xs uppercase tracking-wide flex-shrink-0">
                                      {d.car_number}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => removeDelivery.mutate({ soudaId: s.id, deliveryId: d.id })}
                                    className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0"
                                    title="Remove delivery"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="table-td text-right font-mono font-semibold text-emerald-700">
                          {parseFloat(s.total_delivered).toFixed(0)}
                        </td>
                        <td className="table-td text-right">
                          <span className={`font-bold font-mono ${isPending ? 'text-red-600' : 'text-emerald-600'}`}>
                            {bal.toFixed(0)}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center justify-center gap-1">
                            {isPending && (
                              <button
                                onClick={() => setDelivery(s)}
                                className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                                title="Add Delivery"
                              >
                                <Truck className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setModal(s)}
                              className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDelete(s)}
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <SoudaModal
          souda={modal === 'new' ? null : modal}
          vendors={vendors}
          items={items}
          dalals={dalals}
          routes={routes}
          onClose={() => setModal(null)}
        />
      )}
      {deliveryModal && (
        <DeliveryModal souda={deliveryModal} onClose={() => setDelivery(null)} />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Order"
        message={`Delete this order for "${deleteTarget?.vendor_name}"? All deliveries will also be removed.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDelete(null)}
      />
    </Layout>
  );
}
