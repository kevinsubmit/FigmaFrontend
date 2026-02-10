/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { Navigate } from 'react-router-dom';
import authService from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Check if user has access token
  const token = localStorage.getItem('access_token');
  const localUser = authService.getLocalUser();
  const isAdminPortalUser = Boolean(localUser && (localUser.is_admin || localUser.store_id));
  
  if (!token) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (isAdminPortalUser) {
    authService.logout();
    return <Navigate to="/login" replace />;
  }
  
  // Render children if authenticated
  return <>{children}</>;
}
