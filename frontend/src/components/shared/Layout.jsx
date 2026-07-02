import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import { ToastProvider } from './Toast.jsx';

export default function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="page-title flex-1">{title}</h1>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium hidden sm:block">Live</span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
