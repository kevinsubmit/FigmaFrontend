import { Home, CalendarCheck, Store, Sparkles, MoreHorizontal } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { label: 'Home', to: '/admin/dashboard', icon: Home },
  { label: 'Orders', to: '/admin/appointments', icon: CalendarCheck },
  { label: 'Stores', to: '/admin/stores', icon: Store },
  { label: 'Promos', to: '/admin/promotions', icon: Sparkles },
  { label: 'More', to: '/admin/more', icon: MoreHorizontal },
];

export const BottomTabs = () => (
  <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/90 border-t border-neutral-800 backdrop-blur">
    <div className="grid grid-cols-5 px-2 py-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest ${
                isActive ? 'text-gold-500' : 'text-gray-500'
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
