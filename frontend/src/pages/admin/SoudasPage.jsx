import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Truck, X, PackageCheck, Search, Download, Filter, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import Layout from '../../components/shared/Layout.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getSoudas, createSouda, updateSouda, deleteSouda, addDelivery, deleteDelivery } from '../../api/soudas.api.js';
import { getVendors } from '../../api/vendors.api.js';
import { getItems } from '../../api/items.api.js';
import { getItemCompanies } from '../../api/itemCompanies.api.js';
import { getItemTypes } from '../../api/itemTypes.api.js';
import { getDalals } from '../../api/dalals.api.js';
import { getVehicles } from '../../api/vehicles.api.js';
import { getRoutes } from '../../api/routes.api.js';
import { formatDate } from '../../utils/date.js';

// ─── Searchable vendor combobox ───────────────────────────────────────────────
function VendorSearchSelect({ vendors, value, onChange, hasError }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = vendors.find((v) => String(v.id) === String(value));
  const filtered = query.trim()
    ? vendors.filter((v) => v.name.toLowerCase().includes(query.toLowerCase()))
    : vendors;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (v) => { onChange(String(v.id)); setQuery(''); setOpen(false); };
  const clear = () => { onChange(''); setQuery(''); };

  return (
    <div ref={ref} className="relative">
      <div
        className={`input-field flex items-center gap-2 cursor-pointer ${hasError ? 'border-red-400' : ''}`}
        onClick={() => { setOpen((o) => !o); if (!open) setTimeout(() => ref.current?.querySelector('input')?.focus(), 10); }}
      >
        {open ? (
          <input
            autoFocus
            className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400"
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
            {selected ? selected.name : 'Select party...'}
          </span>
        )}
        {selected && !open && (
          <button type="button" onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-slate-300 hover:text-slate-500 text-xs leading-none">✕</button>
        )}
        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0
            ? <li className="px-4 py-3 text-sm text-slate-400">No vendors found</li>
            : filtered.map((v) => (
              <li
                key={v.id}
                onMouseDown={() => select(v)}
                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${String(v.id) === String(value) ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
              >
                {v.name}
              </li>
            ))
          }
        </ul>
      )}
    </div>
  );
}

// ─── Souda Edit Form (single-row, unchanged behaviour) ───────────────────────
function SoudaEditForm({ souda, vendors, items, dalals, routes, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      order_date: souda.order_date?.slice(0, 10),
      vendor_id: souda.vendor_id,
      item_id: souda.item_id,
      item_company_id: souda.item_company_id || '',
      item_type_id: souda.item_type_id || '',
      qty_ordered: souda.qty_ordered,
      rate: souda.rate,
      location: souda.location || '',
      dalal_id: souda.dalal_id || '',
      notes: souda.notes || '',
    },
  });

  const itemId = watch('item_id');
  const companyId = watch('item_company_id');

  const { data: companies = [] } = useQuery({
    queryKey: ['item-companies', itemId],
    queryFn: () => getItemCompanies(itemId),
    enabled: !!itemId,
  });
  const { data: types = [] } = useQuery({
    queryKey: ['item-types', companyId],
    queryFn: () => getItemTypes(companyId),
    enabled: !!companyId,
  });

  const itemTouched = useRef(false);
  useEffect(() => {
    if (!itemTouched.current) { itemTouched.current = true; return; }
    setValue('item_company_id', '');
    setValue('item_type_id', '');
  }, [itemId, setValue]);

  const companyTouched = useRef(false);
  useEffect(() => {
    if (!companyTouched.current) { companyTouched.current = true; return; }
    setValue('item_type_id', '');
  }, [companyId, setValue]);

  const mutation = useMutation({
    mutationFn: (data) => updateSouda(souda.id, {
      ...data,
      vendor_id: parseInt(data.vendor_id),
      item_id: parseInt(data.item_id),
      item_company_id: data.item_company_id ? parseInt(data.item_company_id) : null,
      item_type_id: data.item_type_id ? parseInt(data.item_type_id) : null,
      dalal_id: data.dalal_id ? parseInt(data.dalal_id) : null,
      qty_ordered: parseFloat(data.qty_ordered),
      rate: parseFloat(data.rate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soudas'] }); toast('Order updated', 'success'); onClose(); },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Edit Order</h3>
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
              <label className="label">Company</label>
              <select className="input-field" disabled={!itemId} {...register('item_company_id')}>
                <option value="">{itemId ? 'Select company...' : 'Select item first'}</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Package / Type</label>
              <select className="input-field" disabled={!companyId} {...register('item_type_id')}>
                <option value="">{companyId ? 'Select type...' : 'Select company first'}</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Single order row (with own cascading queries) ───────────────────────────
const emptyRow = () => ({ _id: Math.random(), item_id: '', location: '', item_company_id: '', item_type_id: '', qty_ordered: '', rate: '', dalal_id: '', notes: '' });

function OrderRow({ row, index, onChange, items, dalals, routes, errors }) {
  const { data: companies = [] } = useQuery({
    queryKey: ['item-companies', row.item_id],
    queryFn: () => getItemCompanies(row.item_id),
    enabled: !!row.item_id,
  });
  const { data: types = [] } = useQuery({
    queryKey: ['item-types', row.item_company_id],
    queryFn: () => getItemTypes(row.item_company_id),
    enabled: !!row.item_company_id,
  });

  const set = (field, val) => onChange({ ...row, [field]: val });

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label">Item *</label>
        <select
          className={`input-field ${errors[`item_${index}`] ? 'border-red-400' : ''}`}
          value={row.item_id}
          onChange={(e) => onChange({ ...row, item_id: e.target.value, item_company_id: '', item_type_id: '' })}
        >
          <option value="">Select item...</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        {errors[`item_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`item_${index}`]}</p>}
      </div>
      <div>
        <label className="label">Location</label>
        <select className="input-field" value={row.location} onChange={(e) => set('location', e.target.value)}>
          <option value="">Select location...</option>
          {routes.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Company</label>
        <select
          className="input-field"
          disabled={!row.item_id}
          value={row.item_company_id}
          onChange={(e) => onChange({ ...row, item_company_id: e.target.value, item_type_id: '' })}
        >
          <option value="">{row.item_id ? 'Select company...' : 'Select item first'}</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Package / Type</label>
        <select
          className="input-field"
          disabled={!row.item_company_id}
          value={row.item_type_id}
          onChange={(e) => set('item_type_id', e.target.value)}
        >
          <option value="">{row.item_company_id ? 'Select type...' : 'Select company first'}</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Qty Ordered *</label>
        <input
          type="number" step="0.01"
          className={`input-field ${errors[`qty_${index}`] ? 'border-red-400' : ''}`}
          placeholder="e.g. 100"
          value={row.qty_ordered}
          onChange={(e) => set('qty_ordered', e.target.value)}
        />
        {errors[`qty_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`qty_${index}`]}</p>}
      </div>
      <div>
        <label className="label">Rate *</label>
        <input
          type="number" step="0.01"
          className={`input-field ${errors[`rate_${index}`] ? 'border-red-400' : ''}`}
          placeholder="e.g. 1655"
          value={row.rate}
          onChange={(e) => set('rate', e.target.value)}
        />
        {errors[`rate_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`rate_${index}`]}</p>}
      </div>
      <div>
        <label className="label">Dalal (Agent)</label>
        <select className="input-field" value={row.dalal_id} onChange={(e) => set('dalal_id', e.target.value)}>
          <option value="">None</option>
          {dalals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <input className="input-field" placeholder="Optional..." value={row.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </div>
  );
}

// ─── Souda Create Modal (multi-row) ──────────────────────────────────────────
function SoudaCreateModal({ vendors, items, dalals, routes, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sharedDate, setSharedDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [errors, setErrors] = useState({});

  const updateRow = (index, updated) => setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    const errs = {};
    if (!sharedDate) errs.date = 'Required';
    if (!vendorId) errs.vendor = 'Required';
    rows.forEach((r, i) => {
      if (!r.item_id) errs[`item_${i}`] = 'Required';
      if (!r.qty_ordered || parseFloat(r.qty_ordered) <= 0) errs[`qty_${i}`] = 'Required';
      if (!r.rate || parseFloat(r.rate) <= 0) errs[`rate_${i}`] = 'Required';
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      for (const row of rows) {
        await createSouda({
          order_date: sharedDate,
          vendor_id: parseInt(vendorId),
          item_id: parseInt(row.item_id),
          item_company_id: row.item_company_id ? parseInt(row.item_company_id) : null,
          item_type_id: row.item_type_id ? parseInt(row.item_type_id) : null,
          qty_ordered: parseFloat(row.qty_ordered),
          rate: parseFloat(row.rate),
          location: row.location || null,
          dalal_id: row.dalal_id ? parseInt(row.dalal_id) : null,
          notes: row.notes || null,
        });
      }
      qc.invalidateQueries({ queryKey: ['soudas'] });
      toast(rows.length === 1 ? 'Order created' : `${rows.length} orders created`, 'success');
      onClose();
    } catch (e) {
      toast(e.response?.data?.message || 'Error creating orders', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-in max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">New Order (Souda)</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Shared: Date + Vendor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className={`input-field ${errors.date ? 'border-red-400' : ''}`}
                value={sharedDate}
                onChange={(e) => setSharedDate(e.target.value)}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="label">Party (Vendor) *</label>
              <VendorSearchSelect
                vendors={vendors}
                value={vendorId}
                onChange={setVendorId}
                hasError={!!errors.vendor}
              />
              {errors.vendor && <p className="text-red-500 text-xs mt-1">{errors.vendor}</p>}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Per-item rows */}
          <div className="space-y-4">
            {rows.map((row, i) => (
              <div key={row._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                {rows.length > 1 && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Item {i + 1}</span>
                    <button
                      onClick={() => removeRow(i)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Remove this item"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <OrderRow
                  row={row}
                  index={i}
                  onChange={(updated) => updateRow(i, updated)}
                  items={items}
                  dalals={dalals}
                  routes={routes}
                  errors={errors}
                />
              </div>
            ))}
          </div>

          {/* Add another item */}
          <button
            type="button"
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-sm font-medium text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Another Item
          </button>
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting
              ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : rows.length > 1 ? `Create ${rows.length} Orders` : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
function SoudaModal({ souda, vendors, items, dalals, routes, onClose }) {
  if (souda) {
    return <SoudaEditForm souda={souda} vendors={vendors} items={items} dalals={dalals} routes={routes} onClose={onClose} />;
  }
  return <SoudaCreateModal vendors={vendors} items={items} dalals={dalals} routes={routes} onClose={onClose} />;
}

// ─── Add Delivery Modal ────────────────────────────────────────────────────────
function DeliveryModal({ souda, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { delivery_date: new Date().toISOString().slice(0, 10), trip_number: 1 },
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Trip #</label>
              <input
                type="number" min="1" step="1"
                className="input-field"
                {...register('trip_number', { min: 1 })}
              />
            </div>
            <div>
              <label className="label">Trip Time</label>
              <input type="time" className="input-field" {...register('trip_time')} />
            </div>
          </div>
          <div>
            <label className="label">Vehicle / Car Number</label>
            <select className="input-field" {...register('car_number')}>
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
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

  const [modal, setModal]               = useState(null);
  const [deliveryModal, setDelivery]    = useState(null);
  const [deleteTarget, setDelete]       = useState(null);
  const [search, setSearch]             = useState('');
  const [filterDalal, setFilterDalal]   = useState('');
  const [filterRoute, setFilterRoute]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');   // '' | 'pending' | 'delivered'
  const [filterCar, setFilterCar]       = useState('');
  const [filterTrip, setFilterTrip]     = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [showFilters, setShowFilters]   = useState(false);

  const { data: soudas = [], isLoading } = useQuery({ queryKey: ['soudas'], queryFn: () => getSoudas() });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const { data: items = [] }   = useQuery({ queryKey: ['items'],   queryFn: getItems });
  const { data: dalals = [] }  = useQuery({ queryKey: ['dalals'],  queryFn: getDalals });
  const { data: routes = [] }  = useQuery({ queryKey: ['routes'],  queryFn: getRoutes });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

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

  const tripOptions = [...new Set(
    soudas.flatMap((s) => s.deliveries.map((d) => d.trip_number || 1))
  )].sort((a, b) => a - b);

  const filtered = soudas.filter((s) => {
    const matchSearch = !search || s.vendor_name?.toLowerCase().includes(search.toLowerCase())
      || s.item_name?.toLowerCase().includes(search.toLowerCase())
      || s.location?.toLowerCase().includes(search.toLowerCase());
    const matchDalal  = !filterDalal  || String(s.dalal_id) === filterDalal;
    const matchRoute  = !filterRoute  || s.location === filterRoute;
    const bal = parseFloat(s.balance || 0);
    const matchStatus = !filterStatus
      || (filterStatus === 'pending'   && bal > 0)
      || (filterStatus === 'delivered' && bal <= 0);
    const matchCar  = !filterCar  || s.deliveries?.some((d) => d.car_number === filterCar);
    const matchTrip = !filterTrip || s.deliveries?.some((d) => (d.trip_number || 1) === parseInt(filterTrip));
    const matchDate = (!filterDateFrom && !filterDateTo) || s.deliveries?.some((d) => {
      const dd = d.delivery_date?.slice(0, 10);
      return (!filterDateFrom || dd >= filterDateFrom) && (!filterDateTo || dd <= filterDateTo);
    });
    return matchSearch && matchDalal && matchRoute && matchStatus && matchCar && matchTrip && matchDate;
  });

  const activeFilterCount = [filterRoute, filterDalal, filterStatus, filterCar, filterTrip, filterDateFrom, filterDateTo].filter(Boolean).length;

  const clearFilters = () => {
    setFilterRoute(''); setFilterDalal(''); setFilterStatus('');
    setFilterCar(''); setFilterTrip(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  const exportToExcel = () => {
    const getExportDeliveries = (s) => {
      if (!filterDateFrom && !filterDateTo && !filterTrip) return s.deliveries;
      return s.deliveries.filter((d) => {
        const dd = d.delivery_date?.slice(0, 10);
        const matchD = (!filterDateFrom || dd >= filterDateFrom) && (!filterDateTo || dd <= filterDateTo);
        const matchT = !filterTrip || (d.trip_number || 1) === parseInt(filterTrip);
        return matchD && matchT;
      });
    };

    const maxDel = Math.max(...filtered.map((s) => getExportDeliveries(s).length), 0);

    const rows = filtered.map((s) => {
      const exportDels = getExportDeliveries(s);
      const row = {
        Date:            s.order_date?.slice(0, 10),
        'Party Name':    s.vendor_name,
        Item:            s.item_name,
        Company:         s.item_company_name || '',
        'Package/Type':  s.item_type_name || '',
        'Qty (Ordered)': parseFloat(s.qty_ordered),
        Rate:            parseFloat(s.rate),
        Location:        s.location || '',
        Dalal:           s.dalal_name || '',
      };
      for (let i = 0; i < maxDel; i++) {
        const d = exportDels[i];
        row[`Del Date ${i + 1}`]  = d ? d.delivery_date?.slice(0, 10) : '';
        row[`Del Trip ${i + 1}`]  = d ? (d.trip_number || 1) : '';
        row[`Del Time ${i + 1}`]  = d?.trip_time ? d.trip_time.slice(0, 5) : '';
        row[`Del Qty ${i + 1}`]   = d ? parseFloat(d.qty_delivered) : '';
        row[`Del Car ${i + 1}`]   = d?.car_number || '';
      }
      row['Total Del'] = parseFloat(s.total_delivered);
      row['Balance']   = parseFloat(s.balance);
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const baseCols = [{ wch: 12 }, { wch: 24 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    const delCols  = Array.from({ length: maxDel * 5 }, () => ({ wch: 12 }));
    ws['!cols'] = [...baseCols, ...delCols, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Soudas');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Soudas_${date}.xlsx`);
  };

  const exportSummary = () => {
    const getFilteredDeliveries = (s) => s.deliveries.filter((d) => {
      const dd = d.delivery_date?.slice(0, 10);
      const matchD = (!filterDateFrom || dd >= filterDateFrom) && (!filterDateTo || dd <= filterDateTo);
      const matchT = !filterTrip || (d.trip_number || 1) === parseInt(filterTrip);
      return matchD && matchT;
    });

    const allTrips = [...new Set(
      filtered.flatMap((s) => getFilteredDeliveries(s).map((d) => d.trip_number || 1))
    )].sort((a, b) => a - b);

    // Pivot: group by item + company + type
    const itemMap = {};
    filtered.forEach((s) => {
      const key = [s.item_name, s.item_company_name || '', s.item_type_name || ''].join('||');
      if (!itemMap[key]) {
        itemMap[key] = { Item: s.item_name, Company: s.item_company_name || '', 'Package/Type': s.item_type_name || '', tripTotals: {}, total: 0 };
      }
      getFilteredDeliveries(s).forEach((d) => {
        const t = d.trip_number || 1;
        itemMap[key].tripTotals[t] = (itemMap[key].tripTotals[t] || 0) + parseFloat(d.qty_delivered);
        itemMap[key].total += parseFloat(d.qty_delivered);
      });
    });

    const summaryRows = Object.values(itemMap).map((item) => {
      const row = { Item: item.Item, Company: item.Company, 'Package/Type': item['Package/Type'] };
      allTrips.forEach((t) => { row[`Trip ${t}`] = item.tripTotals[t] || ''; });
      row['Total'] = item.total;
      return row;
    });

    // Grand total row
    const totalRow = { Item: 'TOTAL', Company: '', 'Package/Type': '' };
    allTrips.forEach((t) => {
      totalRow[`Trip ${t}`] = Object.values(itemMap).reduce((s, it) => s + (it.tripTotals[t] || 0), 0);
    });
    totalRow['Total'] = Object.values(itemMap).reduce((s, it) => s + it.total, 0);
    summaryRows.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(summaryRows);
    ws['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 16 },
      ...allTrips.map(() => ({ wch: 12 })),
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    const label = [filterDateFrom, filterDateTo].filter(Boolean).join(' to ') || 'All Dates';
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
    XLSX.writeFile(wb, `Soudas_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

      {/* Top bar: Search + Filter toggle + Export + New Order */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Search party, item, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${showFilters || activeFilterCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={exportToExcel} className="btn-secondary whitespace-nowrap" title="Export full detail to Excel">
          <Download className="h-4 w-4" /> Export
        </button>
        <button onClick={exportSummary} className="btn-secondary whitespace-nowrap" title="Export trip-wise item summary">
          <Download className="h-4 w-4" /> Summary
        </button>
        <button onClick={() => setModal('new')} className="btn-primary whitespace-nowrap">
          <Plus className="h-4 w-4" /> New Order
        </button>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="card p-4 mb-4 animate-slide-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
              <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            {/* Route */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Route</label>
              <select className="input-field" value={filterRoute} onChange={(e) => setFilterRoute(e.target.value)}>
                <option value="">All Routes</option>
                {routes.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            {/* Dalal */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Dalal</label>
              <select className="input-field" value={filterDalal} onChange={(e) => setFilterDalal(e.target.value)}>
                <option value="">All Dalals</option>
                {dalals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {/* Vehicle */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Vehicle</label>
              <select className="input-field" value={filterCar} onChange={(e) => setFilterCar(e.target.value)}>
                <option value="">All Vehicles</option>
                {vehicles.map((v) => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>
            {/* Trip # */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Trip #</label>
              <select className="input-field" value={filterTrip} onChange={(e) => setFilterTrip(e.target.value)}>
                <option value="">All Trips</option>
                {tripOptions.map((t) => <option key={t} value={t}>Trip {t}</option>)}
              </select>
            </div>
            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Delivery Date From</label>
              <input type="date" className="input-field" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Delivery Date To</label>
              <input type="date" className="input-field" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">{filtered.length} of {soudas.length} orders shown</p>
              <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                <X className="h-3 w-3" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

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
                        <td className="table-td">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 font-medium">{s.item_name}</span>
                            {s.item_company_name && (
                              <span className="text-xs text-slate-500">{s.item_company_name}</span>
                            )}
                            {s.item_type_name && (
                              <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">{s.item_type_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="table-td text-right font-mono">{s.qty_ordered}</td>
                        <td className="table-td text-right font-mono text-slate-500">{s.rate}</td>
                        <td className="table-td text-slate-500 text-xs">{s.location || '—'}</td>
                        <td className="table-td text-slate-500 text-xs">{s.dalal_name || '—'}</td>

                        {/* Deliveries — unlimited */}
                        <td className="table-td" style={{ background: '#f1f8f1' }}>
                          {(() => {
                            const visibleDeliveries = s.deliveries.filter((d) => {
                              const dd = d.delivery_date?.slice(0, 10);
                              const matchD = (!filterDateFrom || dd >= filterDateFrom) && (!filterDateTo || dd <= filterDateTo);
                              const matchT = !filterTrip || (d.trip_number || 1) === parseInt(filterTrip);
                              return matchD && matchT;
                            });
                            const deliveriesToShow = (filterDateFrom || filterDateTo || filterTrip) ? visibleDeliveries : s.deliveries;
                            return deliveriesToShow.length === 0 ? (
                            <span className="text-slate-400 text-xs">{s.deliveries.length === 0 ? 'No deliveries yet' : 'No deliveries in range'}</span>
                          ) : (
                            <div className="space-y-1">
                              {deliveriesToShow.map((d, i) => (
                                <div key={d.id} className="flex items-center gap-2 text-xs">
                                  <span className="w-4 text-slate-400 font-mono flex-shrink-0">{i + 1}.</span>
                                  <span className="text-slate-600 whitespace-nowrap">{formatDate(d.delivery_date)}</span>
                                  {(d.trip_number || d.trip_time) && (
                                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold flex-shrink-0 whitespace-nowrap">
                                      T{d.trip_number || 1}{d.trip_time ? ` · ${d.trip_time.slice(0, 5)}` : ''}
                                    </span>
                                  )}
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
                          );
                          })()}
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
