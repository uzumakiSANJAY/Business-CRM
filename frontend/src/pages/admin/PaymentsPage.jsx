import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, X } from 'lucide-react';
import Layout from '../../components/shared/Layout.jsx';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { getCollections, confirmCollection, rejectCollection } from '../../api/collections.api.js';
import { formatINR } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';

function RejectModal({ collection, onClose }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await rejectCollection(collection.id, reason);
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast('Collection rejected', 'info');
      onClose();
    } catch { toast('Error rejecting collection', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Reject Collection</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm">
            <p className="text-slate-500">Vendor: <span className="font-semibold text-slate-800">{collection.vendor_name}</span></p>
            <p className="text-slate-500">Amount: <span className="font-semibold text-slate-800">{formatINR(collection.amount)}</span></p>
          </div>
          <div>
            <label className="label">Reason for rejection *</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Explain why this collection is being rejected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleReject} disabled={!reason.trim() || loading} className="btn-danger">
              {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [rejectTarget, setRejectTarget] = useState(null);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    select: (d) => d.filter((c) => c.status === 'PENDING'),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmCollection,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collections'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); toast('Payment confirmed!', 'success'); },
    onError: () => toast('Error confirming payment', 'error'),
  });

  return (
    <Layout title="Payment Queue">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-semibold">
          <Clock className="h-4 w-4" />
          {isLoading ? '...' : collections.length} Pending
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : collections.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-slate-700">All caught up!</p>
          <p className="text-slate-400 text-sm mt-1">No pending payment confirmations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collections.map((c) => (
            <div key={c.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-card-lg transition-shadow animate-fade-in">
              {/* Info */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Vendor</p>
                  <p className="text-sm font-semibold text-slate-800">{c.vendor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Collector</p>
                  <p className="text-sm text-slate-600">{c.collector_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Amount</p>
                  <p className="text-sm font-bold text-emerald-700">{formatINR(c.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Date</p>
                  <p className="text-sm text-slate-600">{formatDate(c.collection_date)}</p>
                </div>
              </div>
              {c.notes && (
                <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500 max-w-xs">
                  <span className="font-medium text-slate-600">Note:</span> {c.notes}
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => confirmMutation.mutate(c.id)}
                  disabled={confirmMutation.isPending}
                  className="btn-success"
                >
                  <CheckCircle className="h-4 w-4" /> Confirm
                </button>
                <button onClick={() => setRejectTarget(c)} className="btn-danger">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && <RejectModal collection={rejectTarget} onClose={() => setRejectTarget(null)} />}
    </Layout>
  );
}
