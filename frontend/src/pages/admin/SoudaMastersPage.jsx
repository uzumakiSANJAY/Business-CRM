import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Package, Users2, X } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getItems, createItem, updateItem, deleteItem } from '../../api/items.api.js';
import { getDalals, createDalal, updateDalal, deleteDalal } from '../../api/dalals.api.js';

// ─── Generic name-only modal ────────────────────────────────────────────────
function NameModal({ title, existing, onSave, onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: existing ? { name: existing.name } : {},
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{existing?.id ? `Edit ${title}` : `Add ${title}`}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
          <div>
            <label className="label">{title} Name *</label>
            <input
              className={`input-field ${errors.name ? 'border-red-400' : ''}`}
              placeholder={`Enter ${title.toLowerCase()} name...`}
              {...register('name', { required: 'Required' })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : existing?.id ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Items Tab ───────────────────────────────────────────────────────────────
function ItemsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDelete] = useState(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ['items'], queryFn: getItems });

  const mutation = useMutation({
    mutationFn: (data) => modal?.id ? updateItem(modal.id, data) : createItem(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast(modal?.id ? 'Item updated' : 'Item added', 'success'); setModal(null); },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast('Item removed', 'success'); setDelete(null); },
    onError: () => toast('Error removing item', 'error'),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} items configured</p>
        <button onClick={() => setModal({})} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Item Name</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={2} />)
                : items.length === 0
                  ? (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-slate-400 text-sm">
                        No items yet. Add products like "HBC RBD OIL 15KG".
                      </td>
                    </tr>
                  )
                  : items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">{item.name}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModal(item)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDelete(item)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
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

      {modal !== null && (
        <NameModal
          title="Item"
          existing={modal}
          onSave={(d) => mutation.mutate(d)}
          onClose={() => setModal(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Item"
        message={`Remove "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDelete(null)}
      />
    </>
  );
}

// ─── Dalals Tab ──────────────────────────────────────────────────────────────
function DalalsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDelete] = useState(null);

  const { data: dalals = [], isLoading } = useQuery({ queryKey: ['dalals'], queryFn: getDalals });

  const mutation = useMutation({
    mutationFn: (data) => modal?.id ? updateDalal(modal.id, data) : createDalal(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dalals'] }); toast(modal?.id ? 'Dalal updated' : 'Dalal added', 'success'); setModal(null); },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDalal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dalals'] }); toast('Dalal removed', 'success'); setDelete(null); },
    onError: () => toast('Error removing dalal', 'error'),
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{dalals.length} dalals configured</p>
        <button onClick={() => setModal({})} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Dalal
        </button>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Dalal Name</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={2} />)
                : dalals.length === 0
                  ? (
                    <tr>
                      <td colSpan={2} className="py-12 text-center text-slate-400 text-sm">
                        No dalals yet. Add agents like "Gopal Rathi".
                      </td>
                    </tr>
                  )
                  : dalals.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModal(d)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDelete(d)}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
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

      {modal !== null && (
        <NameModal
          title="Dalal"
          existing={modal}
          onSave={(d) => mutation.mutate(d)}
          onClose={() => setModal(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Dalal"
        message={`Remove "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDelete(null)}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SoudaMastersPage() {
  const [tab, setTab] = useState('items');

  return (
    <Layout title="Souda Masters">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'items'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Package className="h-4 w-4" /> Items
        </button>
        <button
          onClick={() => setTab('dalals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === 'dalals'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users2 className="h-4 w-4" /> Dalals
        </button>
      </div>

      {tab === 'items' ? <ItemsTab /> : <DalalsTab />}
    </Layout>
  );
}
