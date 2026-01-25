import React from 'react';
import { BottomTabs } from './BottomTabs';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen pb-24 app-shell">
    {children}
    <BottomTabs />
  </div>
);
