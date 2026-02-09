import React from 'react';
import { BottomTabs } from './BottomTabs';
import { Globe, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen pb-24 app-shell lg:pb-8">
      <DesktopSidebar />

      <div className="lg:pl-64">
        <header className="hidden lg:flex h-14 items-center justify-between border-b border-blue-100 bg-white/80 px-6 backdrop-blur">
          <p className="text-sm text-slate-500">
            系统支持联系方式：如有问题请联系系统管理员
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
              EN
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4 text-blue-500" />
              {user?.full_name || user?.username || user?.phone || 'Admin'} ({role || 'admin'})
            </span>
          </div>
        </header>

        <main>{children}</main>
      </div>

      <BottomTabs />
    </div>
  );
};
