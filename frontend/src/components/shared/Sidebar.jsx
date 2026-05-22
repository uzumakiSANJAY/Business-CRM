import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, CheckCircle,
  Users, ClipboardList, PlusCircle, LogOut, TrendingUp, Tag, Navigation,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const adminLinks = [
  { to: '/admin/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/admin/vendors',    label: 'Vendors',         icon: Building2 },
  { to: '/admin/bills',      label: 'Bills',           icon: FileText },
  { to: '/admin/payments',   label: 'Payment Queue',   icon: CheckCircle },
  { to: '/admin/collectors', label: 'Collectors',      icon: Users },
  { to: '/admin/categories', label: 'Categories',      icon: Tag },
  { to: '/admin/routes',     label: 'Routes',          icon: Navigation },
  { to: '/admin/audit',      label: 'Audit Log',       icon: ClipboardList },
];

const collectorLinks = [
  { to: '/collector/vendors', label: 'Vendors',          icon: Building2 },
  { to: '/collector/collect', label: 'Submit Collection', icon: PlusCircle },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'ADMIN' ? adminLinks : collectorLinks;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 flex flex-col z-30 shadow-xl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">VendorCRM</p>
            <p className="text-slate-500 text-xs mt-0.5">Collection System</p>
          </div>
        </div>
      </div>

      {/* Role chip */}
      <div className="px-4 pt-4 pb-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          user?.role === 'ADMIN'
            ? 'bg-indigo-900/60 text-indigo-300'
            : 'bg-emerald-900/60 text-emerald-300'
        }`}>
          {user?.role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 flex-shrink-0" size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
