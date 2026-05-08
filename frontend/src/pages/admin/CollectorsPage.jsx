import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, UserX, X, User } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getCollectors, createCollector, updateCollector, deleteCollector } from '../../api/collectors.api.js';
import { formatDate } from '../../utils/date.js';

function CollectorModal({ collector, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!collector?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: collector ? { name: collector.name, email: collector.email } : {},
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateCollector(collector.id, data) : createCollector(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collectors'] });
      toast(isEdit ? 'Collector updated' : 'Collector created', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Collector' : 'Add Collector'}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className={`input-field ${errors.name ? 'border-red-400' : ''}`} placeholder="John Doe" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className={`input-field ${errors.email ? 'border-red-400' : ''}`} placeholder="collector@company.com" {...register('email', { required: 'Required' })} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          {!isEdit && (
            <div>
              <label className="label">Password *</label>
              <input type="password" className={`input-field ${errors.password ? 'border-red-400' : ''}`} placeholder="Min 6 characters" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectorsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const { data: collectors = [], isLoading } = useQuery({ queryKey: ['collectors'], queryFn: getCollectors });

  const deactivateMutation = useMutation({
    mutationFn: deleteCollector,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collectors'] }); toast('Collector deactivated', 'success'); setDeactivateTarget(null); },
    onError: () => toast('Error', 'error'),
  });

  return (
    <Layout title="Collectors">
      <div className="flex justify-end mb-6">
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Collector
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Collector</th>
                <th className="table-th">Email</th>
                <th className="table-th">Status</th>
                <th className="table-th">Joined</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
                : collectors.length === 0
                ? <tr><td colSpan={5} className="py-14 text-center text-slate-400 text-sm">No collectors yet</td></tr>
                : collectors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{c.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-slate-500">{c.email}</td>
                    <td className="table-td">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="table-td text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setModal(c)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {c.is_active && (
                          <button onClick={() => setDeactivateTarget(c)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal && <CollectorModal collector={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      <ConfirmModal
        isOpen={!!deactivateTarget}
        title="Deactivate Collector"
        message={`Deactivate ${deactivateTarget?.name}? They won't be able to login.`}
        onConfirm={() => deactivateMutation.mutate(deactivateTarget?.id)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </Layout>
  );
}
