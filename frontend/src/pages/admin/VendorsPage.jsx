import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, FileText, X, MapPin, Receipt, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getVendors, createVendor, updateVendor, deleteVendor, reorderVendors } from '../../api/vendors.api.js';
import { getCategories } from '../../api/categories.api.js';
import { getRoutes } from '../../api/routes.api.js';
import { createBill } from '../../api/bills.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';

function VendorBillsModal({ vendor, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Active Bills</h3>
            <p className="text-xs text-slate-500 mt-0.5">{vendor.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {vendor.active_bills.map((b) => (
            <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Receipt className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Bill #{b.id}</p>
                  <p className="text-xs text-slate-400">{formatDate(b.generated_date)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">{formatINR(b.amount)}</p>
                <p className="text-xs text-rose-600 font-medium">₹{b.outstanding.toLocaleString('en-IN')} due</p>
              </div>
              <AlertBadge flag={b.alert_flag} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorModal({ vendor, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!vendor?.id;

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: vendor
      ? { ...vendor, category_id: vendor.category_id ?? '' }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, category_id: data.category_id ? parseInt(data.category_id) : null };
      return isEdit ? updateVendor(vendor.id, payload) : createVendor(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast(isEdit ? 'Vendor updated' : 'Vendor created', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Vendor Name *</label>
            <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="Company name" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input className="input-field" placeholder="Full name" {...register('contact_person')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" placeholder="+91 XXXXX XXXXX" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input-field" {...register('category_id')}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Route / Area</label>
              <select className="input-field" {...register('route')}>
                <option value="">— None —</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Street, City..." {...register('address')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEdit ? 'Save Changes' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BillModal({ vendor, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { generated_date: today, bill_type: 'CASH' },
  });

  const mutation = useMutation({
    mutationFn: (data) => createBill({ ...data, vendor_id: vendor.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast('Bill generated successfully', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error generating bill', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Generate Bill</h3>
            <p className="text-xs text-slate-500 mt-0.5">{vendor.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Amount (₹) *</label>
            <input
              type="number" min="1" step="0.01"
              className={`input-field ${errors.amount ? 'border-red-400' : ''}`}
              placeholder="0.00"
              {...register('amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="label">Bill Date *</label>
            <input type="date" className="input-field" {...register('generated_date', { required: 'Required' })} />
          </div>
          <div>
            <label className="label">Bill Type *</label>
            <div className="flex gap-3">
              {[{ value: 'CASH', label: 'Cash' }, { value: 'CHEQUE', label: 'Cheque' }].map(({ value, label }) => (
                <label key={value} className="cursor-pointer flex-1">
                  <input type="radio" value={value} className="sr-only peer" {...register('bill_type')} />
                  <span className="block text-center px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-600 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 transition-all hover:border-indigo-300">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SortableVendorRow({ vendor, onEdit, onBillModal, onBillsPopup, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vendor.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50 transition-colors group">
      <td className="table-td w-8 px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors rounded"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="table-td">
        <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{vendor.name}</p>
        {vendor.phone && <p className="text-xs text-slate-400">{vendor.phone}</p>}
      </td>
      <td className="table-td">
        {vendor.category_name
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">{vendor.category_name}</span>
          : <span className="text-slate-300 text-xs">—</span>}
      </td>
      <td className="table-td">
        {vendor.route
          ? <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" /><span className="text-slate-600 text-sm">{vendor.route}</span></div>
          : <span className="text-slate-300 text-xs">—</span>}
      </td>
      <td className="table-td text-slate-500">{vendor.contact_person || '—'}</td>
      <td className="table-td text-right">
        {vendor.active_bills?.length > 0 ? (
          <button onClick={() => onBillsPopup(vendor)} className="text-right hover:bg-indigo-50 rounded-lg px-2 py-1 transition-colors group w-full">
            <p className="font-semibold text-slate-800 group-hover:text-indigo-700">{formatINR(vendor.active_bills[0].amount)}</p>
            <p className="text-xs text-slate-400">
              Bill #{vendor.active_bills[0].id}
              {vendor.active_bills.length > 1 && (
                <span className="ml-1 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-xs font-semibold">+{vendor.active_bills.length - 1} more</span>
              )}
            </p>
          </button>
        ) : <span className="text-slate-300 text-xs">No bill</span>}
      </td>
      <td className="table-td text-right">
        {vendor.active_bills?.length > 0
          ? <span className="font-semibold text-rose-600">{formatINR(vendor.outstanding)}</span>
          : <span className="text-slate-300">—</span>}
      </td>
      <td className="table-td">
        {vendor.active_bills?.length > 0 ? <AlertBadge flag={vendor.alert_flag} /> : <span className="text-xs text-slate-300">—</span>}
      </td>
      <td className="table-td text-slate-500">
        {vendor.active_bills?.length > 0 ? formatDate(vendor.active_bills[0].generated_date) : '—'}
      </td>
      <td className="table-td">
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => onEdit(vendor)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="Edit vendor">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onBillModal(vendor)} className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Generate bill">
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(vendor)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="Remove vendor">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function VendorsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorModal, setVendorModal] = useState(null);
  const [billModal, setBillModal] = useState(null);
  const [billsPopup, setBillsPopup] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [localVendors, setLocalVendors] = useState([]);

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  // Sync server data → local state (for optimistic drag reorder)
  useEffect(() => { if (vendors.length) setLocalVendors(vendors); }, [vendors]);

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast('Vendor removed', 'success'); setDeleteTarget(null); },
    onError: () => toast('Error removing vendor', 'error'),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderVendors,
    onError: () => { toast('Failed to save order', 'error'); qc.invalidateQueries({ queryKey: ['vendors'] }); },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localVendors.findIndex((v) => v.id === active.id);
    const newIndex = localVendors.findIndex((v) => v.id === over.id);
    const reordered = arrayMove(localVendors, oldIndex, newIndex);
    setLocalVendors(reordered);
    reorderMutation.mutate(reordered.map((v) => v.id));
  };

  const routes = [...new Set(localVendors.map((v) => v.route).filter(Boolean))].sort();
  const isFiltering = !!(search || routeFilter || categoryFilter);

  const filtered = localVendors.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchRoute = !routeFilter || v.route === routeFilter;
    const matchCategory = !categoryFilter || String(v.category_id) === categoryFilter;
    return matchSearch && matchRoute && matchCategory;
  });

  return (
    <Layout title="Vendors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
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
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        )}
        <button onClick={() => setVendorModal('new')} className="btn-primary ml-auto">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="card overflow-hidden">
          {isFiltering && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5" />
              Clear search/filters to drag and reorder vendors
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-th w-8"></th>
                  <th className="table-th">Vendor</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Route</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th text-right">Active Bill</th>
                  <th className="table-th text-right">Outstanding</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Bill Date</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <SortableContext items={localVendors.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-slate-50">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={10} />)
                    : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={10} className="py-16 text-center">
                          <p className="text-slate-400 text-sm">No vendors found</p>
                        </td>
                      </tr>
                    )
                    : filtered.map((v) => (
                      <SortableVendorRow
                        key={v.id}
                        vendor={v}
                        onEdit={setVendorModal}
                        onBillModal={setBillModal}
                        onBillsPopup={setBillsPopup}
                        onDelete={setDeleteTarget}
                      />
                    ))
                  }
                </tbody>
              </SortableContext>
            </table>
          </div>
        </div>
      </DndContext>

      {/* Modals */}
      {billsPopup && <VendorBillsModal vendor={billsPopup} onClose={() => setBillsPopup(null)} />}
      {vendorModal && (
        <VendorModal
          vendor={vendorModal === 'new' ? null : vendorModal}
          onClose={() => setVendorModal(null)}
        />
      )}
      {billModal && <BillModal vendor={billModal} onClose={() => setBillModal(null)} />}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Vendor"
        message={`Remove "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
