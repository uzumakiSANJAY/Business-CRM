import Sidebar from './Sidebar.jsx';
import { ToastProvider } from './Toast.jsx';

export default function Layout({ title, children }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-4 flex items-center justify-between">
            <h1 className="page-title">{title}</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">Live</span>
            </div>
          </header>
          {/* Content */}
          <main className="flex-1 p-8">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
