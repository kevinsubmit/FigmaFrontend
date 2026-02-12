import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StoreApplication from './pages/StoreApplication';
import Applications from './pages/Applications';
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
import ServiceCatalogPage from './pages/ServiceCatalog';
import RiskControl from './pages/RiskControl';
import HomeFeedManager from './pages/HomeFeedManager';
import Customers from './pages/Customers';
import Security from './pages/Security';
import Logs from './pages/Logs';
import Staff from './pages/Staff';

const App = () => (
  <AuthProvider>
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/register" element={<Register />} />
        <Route
          path="/admin/store-application"
          element={
            <ProtectedRoute>
              <StoreApplication />
            </ProtectedRoute>
          }
        />

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
          path="/admin/service-catalog"
          element={
            <ProtectedRoute>
              <ServiceCatalogPage />
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
        <Route
          path="/admin/risk-control"
          element={
            <ProtectedRoute>
              <RiskControl />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/home-feed"
          element={
            <ProtectedRoute>
              <HomeFeedManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute>
              <Applications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <ProtectedRoute>
              <Security />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute>
              <Staff />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={2800}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
        toastClassName="!z-[10000]"
      />
    </>
  </AuthProvider>
);

export default App;
