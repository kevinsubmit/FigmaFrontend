import { CalendarCheck, Home, MoreHorizontal, Sparkles, Store, UserRoundCog, Users } from 'lucide-react';

export const primaryNavItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: Home },
  { label: 'Appointments', to: '/admin/appointments', icon: CalendarCheck },
  { label: 'Staff / Technicians', to: '/admin/staff', icon: UserRoundCog },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Stores', to: '/admin/stores', icon: Store },
  { label: 'Promotions', to: '/admin/promotions', icon: Sparkles },
  { label: 'More', to: '/admin/more', icon: MoreHorizontal },
];
