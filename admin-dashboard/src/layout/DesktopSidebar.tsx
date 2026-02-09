import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { primaryNavItems } from './navConfig';

export const DesktopSidebar = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col border-r border-blue-100 bg-white/95 backdrop-blur">
      <div className="px-5 py-5 border-b border-blue-100">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-500 font-semibold">NailsDash</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Merchant System</h1>
      </div>

      <nav className="flex-1 overflow-auto px-3 py-4 space-y-1.5">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-slate-600 border border-transparent hover:bg-blue-50/70 hover:text-blue-600'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-blue-100 p-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="truncate text-sm font-medium text-slate-900 mt-0.5">
            {user.full_name || user.username || user.phone}
          </p>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

