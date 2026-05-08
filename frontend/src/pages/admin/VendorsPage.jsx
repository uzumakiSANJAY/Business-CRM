import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Search, Edit2, Trash2, FileText, X } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../../api/vendors.api.js';
import { createBill } from '../../api/bills.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';

function VendorModal({ vendor, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!vendor?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: vendor || {},
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateVendor(vendor.id, data) : createVendor(data),
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Person</label>
              <input className="input-field" placeholder="Full name" {...register('contact_person')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" placeholder="+91 XXXXX XXXXX" {...register('phone')} />
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
    defaultValues: { generated_date: today },
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

export default function VendorsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [vendorModal, setVendorModal] = useState(null); // null | 'new' | {vendor}
  const [billModal, setBillModal] = useState(null);     // null | {vendor}
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast('Vendor removed', 'success'); setDeleteTarget(null); },
    onError: () => toast('Error removing vendor', 'error'),
  });

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Vendors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <button onClick={() => setVendorModal('new')} className="btn-primary ml-auto">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Vendor</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Phone</th>
                <th className="table-th text-right">Active Bill</th>
                <th className="table-th text-right">Outstanding</th>
                <th className="table-th">Status</th>
                <th className="table-th">Bill Date</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <p className="text-slate-400 text-sm">No vendors found</p>
                    </td>
                  </tr>
                )
                : filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="table-td">
                      <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{v.name}</p>
                    </td>
                    <td className="table-td text-slate-500">{v.contact_person || '—'}</td>
                    <td className="table-td text-slate-500">{v.phone || '—'}</td>
                    <td className="table-td text-right">
                      {v.active_bill ? (
                        <span className="font-semibold text-slate-800">{formatINR(v.active_bill.amount)}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">No bill</span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      {v.active_bill ? (
                        <span className="font-semibold text-rose-600">{formatINR(v.outstanding)}</span>
                      ) : '—'}
                    </td>
                    <td className="table-td">
                      {v.active_bill
                        ? <AlertBadge flag={v.alert_flag} />
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="table-td text-slate-500">
                      {v.active_bill ? formatDate(v.active_bill.generated_date) : '—'}
                    </td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setVendorModal(v)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Edit vendor"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setBillModal(v)}
                          className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Generate bill"
                          disabled={!!v.active_bill}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Remove vendor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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
