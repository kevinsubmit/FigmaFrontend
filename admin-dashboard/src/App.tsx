import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StoreApplication = lazy(() => import('./pages/StoreApplication'));
const Applications = lazy(() => import('./pages/Applications'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AppointmentsList = lazy(() => import('./pages/AppointmentsList'));
const AppointmentDetail = lazy(() => import('./pages/AppointmentDetail'));
const PromotionsList = lazy(() => import('./pages/PromotionsList'));
const PromotionForm = lazy(() => import('./pages/PromotionForm'));
const StoresList = lazy(() => import('./pages/StoresList'));
const StoreDetail = lazy(() => import('./pages/StoreDetail'));
const Coupons = lazy(() => import('./pages/Coupons'));
const GiftCards = lazy(() => import('./pages/GiftCards'));
const Reviews = lazy(() => import('./pages/Reviews'));
const More = lazy(() => import('./pages/More'));
const ServiceCatalogPage = lazy(() => import('./pages/ServiceCatalog'));
const RiskControl = lazy(() => import('./pages/RiskControl'));
const HomeFeedManager = lazy(() => import('./pages/HomeFeedManager'));
const Customers = lazy(() => import('./pages/Customers'));
const Security = lazy(() => import('./pages/Security'));
const Logs = lazy(() => import('./pages/Logs'));
const Staff = lazy(() => import('./pages/Staff'));
const VipLevels = lazy(() => import('./pages/VipLevels'));
const PushCenter = lazy(() => import('./pages/PushCenter'));
const VersionCenter = lazy(() => import('./pages/VersionCenter'));
const ContactConfig = lazy(() => import('./pages/ContactConfig'));

const App = () => (
  <AuthProvider>
    <>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-50 text-slate-600 flex items-center justify-center">
            Loading...
          </div>
        }
      >
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
              <ProtectedRoute requireSuperAdmin>
                <PromotionsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promotions/new"
            element={
              <ProtectedRoute requireSuperAdmin>
                <PromotionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promotions/:id/edit"
            element={
              <ProtectedRoute requireSuperAdmin>
                <PromotionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <ProtectedRoute requireSuperAdmin>
                <Coupons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gift-cards"
            element={
              <ProtectedRoute requireSuperAdmin>
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
          <Route
            path="/admin/vip-levels"
            element={
              <ProtectedRoute>
                <VipLevels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/push-center"
            element={
              <ProtectedRoute requireSuperAdmin>
                <PushCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/version-center"
            element={
              <ProtectedRoute requireSuperAdmin>
                <VersionCenter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/contact-config"
            element={
              <ProtectedRoute requireSuperAdmin>
                <ContactConfig />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </Suspense>
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
