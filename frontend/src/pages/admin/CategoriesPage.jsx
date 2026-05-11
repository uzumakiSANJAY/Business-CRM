import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import ConfirmModal from '../../components/shared/ConfirmModal.jsx';
import { SkeletonRow } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories.api.js';
import { formatDate } from '../../utils/date.js';

function CategoryModal({ category, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const isEdit = !!category?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: category || {},
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateCategory(category.id, data) : createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast(isEdit ? 'Category updated' : 'Category created', 'success');
      onClose();
    },
    onError: (e) => toast(e.response?.data?.message || 'Error', 'error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Category' : 'Add Category'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Category Name *</label>
            <input
              className={`input-field ${errors.name ? 'border-red-400' : ''}`}
              placeholder="e.g. Electronics, Food & Beverage..."
              {...register('name', { required: 'Required' })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Short description..."
              {...register('description')}
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); toast('Category removed', 'success'); setDeleteTarget(null); },
    onError: () => toast('Error removing category', 'error'),
  });

  return (
    <Layout title="Master Categories">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">{categories.length} categories configured</p>
        <button onClick={() => setModal('new')} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th">Description</th>
                <th className="table-th">Created</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                : categories.length === 0
                ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Tag className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-400 text-sm">No categories yet. Add one to organize vendors.</p>
                      </div>
                    </td>
                  </tr>
                )
                : categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">{cat.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-slate-500">{cat.description || '—'}</td>
                    <td className="table-td text-slate-400 text-sm">{formatDate(cat.created_at)}</td>
                    <td className="table-td">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModal(cat)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Remove"
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

      {modal && (
        <CategoryModal
          category={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove Category"
        message={`Remove "${deleteTarget?.name}"? Vendors in this category will be unlinked.`}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
