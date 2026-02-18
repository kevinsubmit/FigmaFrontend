import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode; requireSuperAdmin?: boolean }> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!user.is_admin && user.store_admin_status && user.store_admin_status !== 'approved') {
    if (location.pathname !== '/admin/store-application') {
      return <Navigate to="/admin/store-application" replace />;
    }
  }

  if (requireSuperAdmin && !user.is_admin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};
