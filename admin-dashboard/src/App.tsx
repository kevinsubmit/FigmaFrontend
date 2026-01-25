import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AppointmentsList from './pages/AppointmentsList';
import AppointmentDetail from './pages/AppointmentDetail';
import PromotionsList from './pages/PromotionsList';
import PromotionForm from './pages/PromotionForm';
import StoresList from './pages/StoresList';
import StoreDetail from './pages/StoreDetail';
import Coupons from './pages/Coupons';
import GiftCards from './pages/GiftCards';
import Reviews from './pages/Reviews';
import More from './pages/More';

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Login />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/appointments/:id"
        element={
          <ProtectedRoute>
            <AppointmentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stores"
        element={
          <ProtectedRoute>
            <StoresList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stores/:id"
        element={
          <ProtectedRoute>
            <StoreDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/promotions"
        element={
          <ProtectedRoute>
            <PromotionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/promotions/new"
        element={
          <ProtectedRoute>
            <PromotionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/promotions/:id/edit"
        element={
          <ProtectedRoute>
            <PromotionForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/coupons"
        element={
          <ProtectedRoute>
            <Coupons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/gift-cards"
        element={
          <ProtectedRoute>
            <GiftCards />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute>
            <Reviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/more"
        element={
          <ProtectedRoute>
            <More />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
