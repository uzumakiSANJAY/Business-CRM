import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, danger = true }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className={`p-2 rounded-xl ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="px-6 pb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
          <p className="text-sm text-slate-500 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="btn-secondary">Cancel</button>
            <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}
