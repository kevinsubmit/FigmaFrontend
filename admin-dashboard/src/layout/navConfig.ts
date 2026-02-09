import { CalendarCheck, Home, MoreHorizontal, Sparkles, Store } from 'lucide-react';

export const primaryNavItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: Home },
  { label: 'Appointments', to: '/admin/appointments', icon: CalendarCheck },
  { label: 'Stores', to: '/admin/stores', icon: Store },
  { label: 'Promotions', to: '/admin/promotions', icon: Sparkles },
  { label: 'More', to: '/admin/more', icon: MoreHorizontal },
];

