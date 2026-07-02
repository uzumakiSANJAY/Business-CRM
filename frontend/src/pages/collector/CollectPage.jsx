import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  IndianRupee, CheckCircle, Receipt, Wallet, MapPin,
  AlertTriangle, Clock, ChevronRight, ArrowLeft,
} from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import AlertBadge from '../../components/shared/AlertBadge.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getVendors } from '../../api/vendors.api.js';
import { createCollection } from '../../api/collections.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate, daysDiff } from '../../utils/date.js';

const PAYMENT_MODES = [
  { value: 'CASH',          label: 'Cash' },
  { value: 'UPI',           label: 'UPI' },
  { value: 'CREDIT_CARD',   label: 'Credit Card' },
  { value: 'CHEQUE',        label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

function VendorCard({ vendor, selected, onClick }) {
  const bill  = vendor.active_bills?.[0];
  const days  = bill ? daysDiff(bill.generated_date) : 0;
  const isCrit = vendor.alert_flag === 'CRIT';
  const isWarn = vendor.alert_flag === 'WARN';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-md ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : isCrit
          ? 'border-red-200 bg-red-50/40 hover:border-red-400'
          : isWarn
          ? 'border-amber-200 bg-amber-50/40 hover:border-amber-400'
          : 'border-slate-200 bg-white hover:border-indigo-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{vendor.name}</p>
          {vendor.route && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-400 truncate">{vendor.route}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AlertBadge flag={vendor.alert_flag} />
          <ChevronRight className={`h-4 w-4 transition-colors ${selected ? 'text-indigo-500' : 'text-slate-300'}`} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-slate-400">Bill</p>
          <p className="text-sm font-semibold text-slate-700">{formatINR(bill?.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Outstanding</p>
          <p className={`text-sm font-bold ${isCrit ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-slate-700'}`}>
            {formatINR(vendor.outstanding)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Days</p>
          <p className={`text-sm font-semibold flex items-center gap-1 ${isCrit ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-slate-600'}`}>
            <Clock className="h-3 w-3" />{days}d
          </p>
        </div>
      </div>

      {vendor.active_bills?.length > 1 && (
        <p className="mt-2 text-xs text-indigo-600 font-medium">{vendor.active_bills.length} active bills</p>
      )}
    </button>
  );
}

function CollectionForm({ vendor, onBack, onSuccess }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedBill, setSelectedBill] = useState(
    vendor.active_bills?.length === 1 ? vendor.active_bills[0] : null
  );
  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { collection_date: today, payment_mode: 'CASH' },
  });

  const mutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      reset({ collection_date: today, payment_mode: 'CASH' });
      onSuccess();
    },
    onError: (e) => toast(e.response?.data?.message || 'Submission failed', 'error'),
  });

  const onSubmit = (data) => {
    if (!selectedBill) return;
    mutation.mutate({
      bill_id: selectedBill.id,
      vendor_id: vendor.id,
      amount: parseFloat(data.amount),
      collection_date: data.collection_date,
      notes: data.notes,
      payment_mode: data.payment_mode,
    });
  };

  return (
    <div className="card p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <button type="button" onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-700 font-bold text-sm">{vendor.name.charAt(0)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{vendor.name}</p>
          <p className="text-xs text-slate-400">
            Outstanding: <span className="font-semibold text-rose-600">{formatINR(vendor.outstanding)}</span>
          </p>
        </div>
      </div>

      {/* Bill selector */}
      {vendor.active_bills?.length > 1 && (
        <div>
          <label className="label">Select Bill *</label>
          <div className="space-y-2">
            {vendor.active_bills.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBill(b)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                  selectedBill?.id === b.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Bill #{b.id}</span>
                    <span className="text-xs text-slate-400">{formatDate(b.generated_date)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-600">{formatINR(b.outstanding)} due</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bill info strip */}
      {selectedBill && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-in">
          <div>
            <p className="text-xs text-indigo-400">Bill Amount</p>
            <p className="text-sm font-bold text-indigo-800">{formatINR(selectedBill.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400">Outstanding</p>
            <p className="text-sm font-bold text-rose-700">{formatINR(selectedBill.outstanding)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400">Bill Date</p>
            <p className="text-sm font-medium text-indigo-700">{formatDate(selectedBill.generated_date)}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400">Type</p>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${selectedBill.bill_type === 'CHEQUE' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {selectedBill.bill_type === 'CHEQUE' ? 'Cheque' : 'Cash'}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Payment Mode */}
        <div>
          <label className="label"><Wallet className="inline h-3 w-3 mr-1 text-slate-400" />Mode of Payment *</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_MODES.map(({ value, label }) => (
              <label key={value} className="cursor-pointer">
                <input type="radio" value={value} className="sr-only peer" {...register('payment_mode', { required: true })} />
                <span className="block text-center px-2 py-2 rounded-xl border-2 border-slate-200 text-xs sm:text-sm font-medium text-slate-600 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 transition-all hover:border-indigo-300">
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
              type="number" min="1" step="0.01" placeholder="0.00"
              className={`input-field pl-10 text-lg font-semibold ${errors.amount ? 'border-red-400' : ''}`}
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
          <textarea className="input-field resize-none" rows={2} placeholder="Any additional information..." {...register('notes')} />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || !selectedBill}
          className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutation.isPending
            ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
            : 'Submit Collection'}
        </button>
      </form>
    </div>
  );
}

export default function CollectPage() {
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [success, setSuccess] = useState(null); // stores vendor name on success

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const activeVendors = vendors.filter((v) => v.active_bills?.length > 0);
  const routes = [...new Set(activeVendors.map((v) => v.route).filter(Boolean))].sort();
  const vendorsForRoute = selectedRoute
    ? activeVendors.filter((v) => v.route === selectedRoute)
    : activeVendors;

  const urgentCount = vendorsForRoute.filter((v) => v.alert_flag === 'CRIT').length;
  const warnCount   = vendorsForRoute.filter((v) => v.alert_flag === 'WARN').length;

  const handleSelectVendor = (v) => {
    setSelectedVendor(v);
  };

  const handleBack = () => setSelectedVendor(null);

  const handleSuccess = (vendorName) => {
    setSelectedVendor(null);
    setSuccess(vendorName);
    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <Layout title="Submit Collection">
      {/* Success banner */}
      {success && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 animate-slide-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">
            Collection submitted for <span className="font-bold">{success}</span> — awaiting admin confirmation.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Left panel: Route filter + Vendor cards ── */}
        <div className={`lg:w-[420px] xl:w-[480px] flex-shrink-0 space-y-4 ${selectedVendor ? 'hidden lg:block' : ''}`}>
          {/* Route dropdown */}
          <div className="card p-3">
            <select
              value={selectedRoute}
              onChange={(e) => { setSelectedRoute(e.target.value); setSelectedVendor(null); }}
              className="input-field font-medium"
            >
              <option value="">All Routes ({activeVendors.length} vendors)</option>
              {routes.map((r) => (
                <option key={r} value={r}>
                  {r} ({activeVendors.filter(v => v.route === r).length} vendors)
                </option>
              ))}
            </select>
          </div>

          {/* Alert summary */}
          {(urgentCount > 0 || warnCount > 0) && (
            <div className="flex gap-3">
              {urgentCount > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5" />{urgentCount} Urgent
                </div>
              )}
              {warnCount > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />{warnCount} Follow-up
                </div>
              )}
            </div>
          )}

          {/* Vendor cards */}
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
                ))
              : vendorsForRoute.length === 0
              ? (
                <div className="card p-10 text-center">
                  <p className="text-slate-400 text-sm">No vendors with active bills{selectedRoute ? ` on ${selectedRoute}` : ''}</p>
                </div>
              )
              : vendorsForRoute.map((v) => (
                <VendorCard
                  key={v.id}
                  vendor={v}
                  selected={selectedVendor?.id === v.id}
                  onClick={() => handleSelectVendor(v)}
                />
              ))
            }
          </div>
        </div>

        {/* ── Right panel: Collection form ── */}
        <div className="flex-1">
          {selectedVendor ? (
            <CollectionForm
              key={selectedVendor.id}
              vendor={selectedVendor}
              onBack={handleBack}
              onSuccess={() => handleSuccess(selectedVendor.name)}
            />
          ) : (
            <div className="hidden lg:flex card p-10 h-full min-h-[320px] items-center justify-center text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
                  <Receipt className="h-8 w-8 text-indigo-300" />
                </div>
                <p className="text-slate-500 font-medium">Select a vendor from the left</p>
                <p className="text-slate-400 text-sm">The collection form will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
