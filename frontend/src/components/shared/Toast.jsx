import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const ICONS = { success: CheckCircle, error: XCircle, info: Info };
  const STYLES = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-indigo-50 border-indigo-200 text-indigo-800',
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] || Info;
          return (
            <div key={id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm animate-slide-in ${STYLES[type]}`}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{message}</span>
              <button onClick={() => remove(id)} className="opacity-60 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
