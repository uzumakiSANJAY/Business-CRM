import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { PlusCircle, IndianRupee, CheckCircle } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getVendors } from '../../api/vendors.api.js';
import { createCollection } from '../../api/collections.api.js';
import { formatINR } from '../../utils/currency.js';

export default function CollectPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [success, setSuccess] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const activeVendors = vendors.filter((v) => v.active_bill);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { collection_date: today },
  });

  const mutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      reset({ collection_date: today });
      setSelectedVendor(null);
      setSuccess(true);
    },
    onError: (e) => toast(e.response?.data?.message || 'Submission failed', 'error'),
  });

  const onSubmit = (data) => {
    if (!selectedVendor) return;
    mutation.mutate({
      bill_id: selectedVendor.active_bill.id,
      vendor_id: selectedVendor.id,
      amount: parseFloat(data.amount),
      collection_date: data.collection_date,
      notes: data.notes,
    });
  };

  const handleVendorChange = (e) => {
    const id = parseInt(e.target.value);
    setSelectedVendor(activeVendors.find((v) => v.id === id) || null);
  };

  if (success) {
    return (
      <Layout title="Submit Collection">
        <div className="max-w-xl">
          <div className="card p-10 flex flex-col items-center text-center gap-4 animate-slide-in">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">Collection Submitted!</p>
              <p className="text-sm text-slate-500 mt-1">Awaiting admin confirmation.</p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="btn-primary mt-2"
            >
              Submit Another
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Submit Collection">
      <div className="max-w-xl">
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <PlusCircle className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">New Collection Entry</p>
              <p className="text-xs text-slate-400">Will be sent to admin for confirmation</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Vendor select */}
            <div>
              <label className="label">Select Vendor *</label>
              <select
                className="input-field"
                onChange={handleVendorChange}
                defaultValue=""
              >
                <option value="" disabled>Choose a vendor with active bill...</option>
                {activeVendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — Outstanding: {formatINR(v.outstanding)}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor info card */}
            {selectedVendor && (
              <div className="bg-indigo-50 rounded-xl p-4 grid grid-cols-2 gap-3 animate-slide-in">
                <div>
                  <p className="text-xs text-indigo-500 font-medium">Bill Amount</p>
                  <p className="text-sm font-bold text-indigo-800">{formatINR(selectedVendor.active_bill?.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-500 font-medium">Outstanding</p>
                  <p className="text-sm font-bold text-rose-700">{formatINR(selectedVendor.outstanding)}</p>
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="label">Amount Collected (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className={`input-field pl-10 ${errors.amount ? 'border-red-400' : ''}`}
                  {...register('amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="label">Collection Date *</label>
              <input type="date" className="input-field" {...register('collection_date', { required: 'Required' })} />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="Any additional information..."
                {...register('notes')}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending || !selectedVendor}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : 'Submit Collection'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
