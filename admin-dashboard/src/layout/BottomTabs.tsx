import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { primaryNavItems } from './navConfig';

export const BottomTabs = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (!user.is_admin && user.store_admin_status && user.store_admin_status !== 'approved') {
    return null;
  }
  const navItems = user.is_admin
    ? primaryNavItems
    : primaryNavItems.filter((item) => item.to !== '/admin/promotions');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 border-t border-blue-100 backdrop-blur lg:hidden">
      <div className="grid px-2 py-3" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
        {navItems.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest ${
                  isActive ? 'text-gold-500' : 'text-slate-500'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
