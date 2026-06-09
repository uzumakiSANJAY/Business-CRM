import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { PlusCircle, IndianRupee, CheckCircle, Receipt, Wallet } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getVendors } from '../../api/vendors.api.js';
import { createCollection } from '../../api/collections.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';

const PAYMENT_MODES = [
  { value: 'CASH',         label: 'Cash' },
  { value: 'UPI',          label: 'UPI' },
  { value: 'CREDIT_CARD',  label: 'Credit Card' },
  { value: 'CHEQUE',       label: 'Cheque' },
  { value: 'BANK_TRANSFER',label: 'Bank Transfer' },
];

export default function CollectPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [success, setSuccess] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const activeVendors = vendors.filter((v) => v.active_bills?.length > 0);
  const routes = [...new Set(activeVendors.map((v) => v.route).filter(Boolean))].sort();
  const vendorsForRoute = selectedRoute
    ? activeVendors.filter((v) => v.route === selectedRoute)
    : activeVendors;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { collection_date: today, payment_mode: 'CASH' },
  });

  const mutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      reset({ collection_date: today, payment_mode: 'CASH' });
      setSelectedRoute('');
      setSelectedVendor(null);
      setSelectedBill(null);
      setSuccess(true);
    },
    onError: (e) => toast(e.response?.data?.message || 'Submission failed', 'error'),
  });

  const onSubmit = (data) => {
    if (!selectedVendor || !selectedBill) return;
    mutation.mutate({
      bill_id: selectedBill.id,
      vendor_id: selectedVendor.id,
      amount: parseFloat(data.amount),
      collection_date: data.collection_date,
      notes: data.notes,
      payment_mode: data.payment_mode,
    });
  };

  const handleRouteChange = (e) => {
    setSelectedRoute(e.target.value);
    setSelectedVendor(null);
    setSelectedBill(null);
  };

  const handleVendorChange = (e) => {
    const id = parseInt(e.target.value);
    const vendor = vendorsForRoute.find((v) => v.id === id) || null;
    setSelectedVendor(vendor);
    setSelectedBill(vendor?.active_bills?.length === 1 ? vendor.active_bills[0] : null);
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
            <button onClick={() => setSuccess(false)} className="btn-primary mt-2">
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
            {/* Route filter */}
            {routes.length > 0 && (
              <div>
                <label className="label">Select Route *</label>
                <select className="input-field" value={selectedRoute} onChange={handleRouteChange}>
                  <option value="">All Routes</option>
                  {routes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Vendor select */}
            <div>
              <label className="label">Select Vendor *</label>
              <select
                className="input-field"
                onChange={handleVendorChange}
                value={selectedVendor?.id || ''}
              >
                <option value="" disabled>Choose a vendor with active bill...</option>
                {vendorsForRoute.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}{!selectedRoute && v.route ? ` — ${v.route}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill selector — shown only when vendor has multiple active bills */}
            {selectedVendor && selectedVendor.active_bills.length > 1 && (
              <div>
                <label className="label">Select Bill to Collect Against *</label>
                <select
                  className="input-field"
                  value={selectedBill?.id || ''}
                  onChange={(e) => {
                    const bill = selectedVendor.active_bills.find((b) => b.id === parseInt(e.target.value));
                    setSelectedBill(bill || null);
                  }}
                >
                  <option value="" disabled>Choose a bill...</option>
                  {selectedVendor.active_bills.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bill #{b.id} — {formatINR(b.amount)} — {formatDate(b.generated_date)} (Outstanding: {formatINR(b.outstanding)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Bill info card */}
            {selectedVendor && selectedBill && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-slide-in space-y-3">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wide">
                  <Receipt className="h-3.5 w-3.5" />
                  Paying Against Bill #{selectedBill.id}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Bill Amount</p>
                    <p className="text-sm font-bold text-indigo-800">{formatINR(selectedBill.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Outstanding</p>
                    <p className="text-sm font-bold text-rose-700">{formatINR(selectedBill.outstanding)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Bill Date</p>
                    <p className="text-sm font-medium text-indigo-700">{formatDate(selectedBill.generated_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">Bill Type</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${selectedBill.bill_type === 'CHEQUE' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {selectedBill.bill_type === 'CHEQUE' ? 'Cheque' : 'Cash'}
                    </span>
                  </div>
                </div>
                {selectedVendor.route && (
                  <div className="flex items-center gap-2 pt-1 border-t border-indigo-100">
                    <span className="text-xs text-indigo-500">Route:</span>
                    <span className="text-xs font-medium text-indigo-700">{selectedVendor.route}</span>
                    {selectedVendor.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVendor.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-xs text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                      >
                        Open Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment Mode */}
            <div>
              <label className="label">
                <Wallet className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                Mode of Payment *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_MODES.map(({ value, label }) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" value={value} className="sr-only peer" {...register('payment_mode', { required: true })} />
                    <span className="block text-center px-3 py-2 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-600 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 transition-all hover:border-indigo-300">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

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
              disabled={mutation.isPending || !selectedVendor || !selectedBill}
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
