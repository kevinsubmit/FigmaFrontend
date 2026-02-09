import React from 'react';
import { BottomTabs } from './BottomTabs';
import { DesktopSidebar } from './DesktopSidebar';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen pb-24 app-shell lg:pb-8">
      <DesktopSidebar />

      <div className="lg:pl-64">
        <main>{children}</main>
      </div>

      <BottomTabs />
    </div>
  );
};
