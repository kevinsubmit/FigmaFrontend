import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { toast } from 'react-toastify';
import { Sparkles } from 'lucide-react';

export type Page = 'home' | 'services' | 'appointments' | 'profile' | 'deals' | 'notifications' | 'pin-detail' | 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description' | 'login' | 'register' | 'my-reviews' | 'my-favorites' | 'change-password' | 'phone-management' | 'referral' | 'language' | 'feedback-support' | 'partnership' | 'privacy-safety' | 'about';

const Home = lazy(() => import('./components/Home').then((m) => ({ default: m.Home })));
const Services = lazy(() => import('./components/Services').then((m) => ({ default: m.Services })));
const Appointments = lazy(() => import('./components/Appointments').then((m) => ({ default: m.Appointments })));
const Profile = lazy(() => import('./components/Profile').then((m) => ({ default: m.Profile })));
const PinDetail = lazy(() => import('./components/PinDetail').then((m) => ({ default: m.PinDetail })));
const EditProfile = lazy(() => import('./components/EditProfile').then((m) => ({ default: m.EditProfile })));
const OrderHistory = lazy(() => import('./components/OrderHistory').then((m) => ({ default: m.OrderHistory })));
const MyPoints = lazy(() => import('./components/MyPoints').then((m) => ({ default: m.MyPoints })));
const MyCoupons = lazy(() => import('./components/MyCoupons').then((m) => ({ default: m.MyCoupons })));
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));
const MyGiftCards = lazy(() => import('./components/MyGiftCards').then((m) => ({ default: m.MyGiftCards })));
const Deals = lazy(() => import('./components/Deals').then((m) => ({ default: m.Deals })));
const VipDescription = lazy(() => import('./components/VipDescription').then((m) => ({ default: m.VipDescription })));
const Notifications = lazy(() => import('./components/Notifications').then((m) => ({ default: m.Notifications })));
const Login = lazy(() => import('./components/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./components/Register').then((m) => ({ default: m.Register })));
const MyReviews = lazy(() => import('./components/MyReviews').then((m) => ({ default: m.MyReviews })));
const MyFavorites = lazy(() => import('./components/MyFavorites').then((m) => ({ default: m.MyFavorites })));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const PhoneManagement = lazy(() => import('./components/PhoneManagement'));
const ReferralPage = lazy(() => import('./components/ReferralPage'));
const LanguageSettings = lazy(() => import('./components/LanguageSettings').then((m) => ({ default: m.LanguageSettings })));
const FeedbackSupport = lazy(() => import('./components/FeedbackSupport').then((m) => ({ default: m.FeedbackSupport })));
const PartnershipInquiry = lazy(() => import('./components/PartnershipInquiry').then((m) => ({ default: m.PartnershipInquiry })));
const PrivacySafety = lazy(() => import('./components/PrivacySafety').then((m) => ({ default: m.PrivacySafety })));
const AboutUs = lazy(() => import('./components/AboutUs').then((m) => ({ default: m.AboutUs })));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-black pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
      </div>
    </div>
  );
}

// Main App Router Component
function AppRouter() {
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [settingsSection, setSettingsSection] = useState<'main' | 'vip'>('main');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isViewingStoreDetails, setIsViewingStoreDetails] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Force clear body overflow on route change to prevent scroll lock
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.removeProperty('overflow');
  }, [location.pathname]);

  // Disable browser scroll restoration to avoid landing mid-page on subroutes
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);
  
  // Create a ref to store scroll positions for each page
  const scrollPositions = useRef<Record<string, number>>({});

  // Determine current page from URL
  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/services' || path.startsWith('/services/')) return 'services';
    if (path === '/appointments') return 'appointments';
    if (path === '/profile') return 'profile';
    if (path === '/deals') return 'deals';
    if (path === '/pin-detail') return 'pin-detail';
    if (path === '/edit-profile') return 'edit-profile';
    if (path === '/order-history') return 'order-history';
    if (path === '/my-points') return 'my-points';
    if (path === '/my-coupons') return 'my-coupons';
    if (path === '/my-gift-cards') return 'my-gift-cards';
    if (path === '/settings') return 'settings';
    if (path === '/vip-description') return 'vip-description';
    if (path === '/notifications') return 'notifications';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/my-reviews') return 'my-reviews';
    if (path === '/my-favorites') return 'my-favorites';
    if (path === '/change-password') return 'change-password';
    if (path === '/phone-management') return 'phone-management';
    if (path === '/referral') return 'referral';
    if (path === '/language') return 'language';
    if (path === '/feedback-support') return 'feedback-support';
    if (path === '/partnership') return 'partnership';
    if (path === '/privacy-safety') return 'privacy-safety';
    if (path === '/about') return 'about';
    return 'home';
  };

  const currentPage = getCurrentPage();
  // Hide bottom nav for full-screen pages and when viewing store details in services page
  const isFullScreenPage = currentPage === 'pin-detail' || currentPage === 'edit-profile' || currentPage === 'order-history' || currentPage === 'my-points' || currentPage === 'my-coupons' || currentPage === 'my-gift-cards' || currentPage === 'settings' || currentPage === 'vip-description' || currentPage === 'notifications' || currentPage === 'login' || currentPage === 'register' || currentPage === 'my-reviews' || currentPage === 'my-favorites' || currentPage === 'change-password' || currentPage === 'phone-management' || currentPage === 'referral' || currentPage === 'language' || currentPage === 'feedback-support' || currentPage === 'partnership' || currentPage === 'privacy-safety' || currentPage === 'about' || (currentPage === 'services' && isViewingStoreDetails);

  const handleNavigate = (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => {
    console.log('handleNavigate called with page:', page);
    // Save current scroll position before navigating
    scrollPositions.current[currentPage] = window.scrollY;
    
    // Navigate using react-router
    const routeMap: Record<string, string> = {
      home: '/',
      services: '/services',
      appointments: '/appointments',
      profile: '/profile',
      deals: '/deals'
    };
    
    console.log('Navigating to:', routeMap[page]);
    navigate(routeMap[page]);
  };

  const handlePinClick = (pinData: any) => {
    // Save scroll position
    scrollPositions.current[currentPage] = window.scrollY;

    const normalizedPin = {
      ...pinData,
      image_url: pinData?.image_url || pinData?.url,
    };

    setSelectedPin(normalizedPin);
    sessionStorage.setItem('lastPin', JSON.stringify(normalizedPin));
    navigate(`/pin-detail?id=${normalizedPin.id}`);
  };

  const handleSaveProfile = (newData: { avatar: string }) => {
    navigate('/profile');
  };

  const handleBookingSuccess = (bookingData: any) => {
    setMyBookings([...myBookings, bookingData]);
    navigate('/appointments');
    setSelectedPin(null);
  };

  // Improved scroll management: restore for main tabs, reset for sub-pages
  useLayoutEffect(() => {
    const mainTabs: Page[] = ['home', 'services', 'appointments', 'profile', 'deals'];
    if (mainTabs.includes(currentPage)) {
      const savedPosition = scrollPositions.current[currentPage] || 0;
      window.scrollTo(0, savedPosition);
      return;
    }
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Ensure sub-pages always start at top on navigation (Safari needs multiple ticks)
  useEffect(() => {
    const mainTabs: Page[] = ['home', 'services', 'appointments', 'profile', 'deals'];
    if (!mainTabs.includes(currentPage)) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      setTimeout(() => window.scrollTo(0, 0), 50);
    }
  }, [location.pathname, currentPage]);

  const handleSelectSalon = (salon: any) => {
    // Save current scroll
    scrollPositions.current[currentPage] = window.scrollY;
    // Navigate directly to the store details page using store ID
    const storeId = salon.id || 1;
    navigate(`/services/${storeId}`);
  };

  return (
    <div className="min-h-screen bg-black pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Login Route - Public */}
        <Route path="/login" element={
          <Login 
            onNavigate={(page) => navigate(page === 'home' ? '/' : `/${page}`)}
            onBack={() => navigate(-1)}
          />
        } />

        {/* Register Route - Public */}
        <Route path="/register" element={
          <Register 
            onNavigate={(page) => navigate(page === 'home' ? '/' : `/${page}`)}
            onBack={() => navigate(-1)}
          />
        } />

        {/* Protected Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home 
              onNavigate={handleNavigate} 
              onPinClick={handlePinClick}
            />
          </ProtectedRoute>
        } />

        <Route path="/services" element={
          <ProtectedRoute>
            <Services 
              onBookingSuccess={handleBookingSuccess}
              onStoreDetailsChange={setIsViewingStoreDetails}
            />
          </ProtectedRoute>
        } />

        <Route path="/services/:storeId" element={
          <ProtectedRoute>
            <Services 
              onBookingSuccess={handleBookingSuccess}
              onStoreDetailsChange={setIsViewingStoreDetails}
            />
          </ProtectedRoute>
        } />

        <Route path="/appointments" element={
          <ProtectedRoute>
            <Appointments 
              newBooking={myBookings[myBookings.length - 1]} 
              onClearNewBooking={() => setMyBookings(myBookings.slice(0, -1))} 
              onNavigate={handleNavigate}
            />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile 
              onNavigate={(page, sub) => {
                scrollPositions.current[currentPage] = window.scrollY;
                if (page === 'settings' && sub) {
                  setSettingsSection(sub as any);
                } else {
                  setSettingsSection('main');
                }
                const routeMap: Record<string, string> = {
                  'edit-profile': '/edit-profile',
                  'order-history': '/order-history',
                  'my-points': '/my-points',
                  'my-coupons': '/my-coupons',
                  'my-gift-cards': '/my-gift-cards',
                  'settings': '/settings',
                  'vip-description': '/vip-description',
                  'notifications': '/notifications',
                  'my-reviews': '/my-reviews',
                  'my-favorites': '/my-favorites',
                  'referral': '/referral'
                };
                navigate(routeMap[page] || '/profile');
              }}
            />
          </ProtectedRoute>
        } />

        <Route path="/deals" element={
          <ProtectedRoute>
            <Deals 
              onBack={() => navigate('/')}
              onSelectSalon={handleSelectSalon}
            />
          </ProtectedRoute>
        } />

        {/* Sub-pages / Overlays */}
        <Route path="/pin-detail" element={
          <ProtectedRoute>
            <PinDetail 
                onBack={() => navigate('/')} 
                onBookNow={(pinId) => {
                  const resolvedPinId = pinId ?? selectedPin?.id;
                  navigate(resolvedPinId ? `/services?pin_id=${resolvedPinId}` : '/services');
                  toast.info("Style reference added to your booking!", {
                    icon: <Sparkles className="w-4 h-4 text-[#D4AF37]" />,
                    style: { background: '#1a1a1a', border: '1px solid #D4AF3733', color: '#fff' }
                  });
                }}
                onPinClick={(pin) => {
                  setSelectedPin(pin);
                  sessionStorage.setItem('lastPin', JSON.stringify(pin));
                  navigate(`/pin-detail?id=${pin.id}`);
                }}
                pinData={selectedPin}
              />
          </ProtectedRoute>
        } />

        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } />

        <Route path="/order-history" element={
          <ProtectedRoute>
            <OrderHistory 
                onBack={() => navigate('/profile')}
              />
          </ProtectedRoute>
        } />

        <Route path="/my-points" element={
          <ProtectedRoute>
            <MyPoints 
                onBack={() => navigate('/profile')}
              />
          </ProtectedRoute>
        } />

        <Route path="/my-coupons" element={
          <ProtectedRoute>
            <MyCoupons 
                onBack={() => navigate('/profile')}
              />
          </ProtectedRoute>
        } />
        
        <Route path="/referral" element={
          <ProtectedRoute>
            <ReferralPage />
          </ProtectedRoute>
        } />

        <Route path="/my-gift-cards" element={
          <ProtectedRoute>
            <MyGiftCards 
                onBack={() => navigate('/profile')}
              />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings
                initialSection={settingsSection}
                onBack={() => {
                  navigate('/profile');
                  setSettingsSection('main');
                }}
              />
          </ProtectedRoute>
        } />

        <Route path="/vip-description" element={
          <ProtectedRoute>
            <VipDescription 
                onBack={() => {
                  if (location.state?.from === 'settings') {
                    navigate('/settings');
                  } else {
                    navigate('/profile');
                  }
                }}
              />
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications 
              onBack={() => navigate(-1)}
              onNavigate={(page) => navigate(page === 'home' ? '/' : `/${page}`)}
            />
          </ProtectedRoute>
        } />


        <Route path="/my-reviews" element={
          <ProtectedRoute>
            <MyReviews />
          </ProtectedRoute>
        } />
        
        <Route path="/my-favorites" element={
          <ProtectedRoute>
            <MyFavorites />
          </ProtectedRoute>
        } />

        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />

        <Route path="/phone-management" element={
          <ProtectedRoute>
            <PhoneManagement />
          </ProtectedRoute>
        } />

        <Route path="/language" element={
          <ProtectedRoute>
            <LanguageSettings />
          </ProtectedRoute>
        } />

        <Route path="/feedback-support" element={
          <ProtectedRoute>
            <FeedbackSupport />
          </ProtectedRoute>
        } />

        <Route path="/partnership" element={
          <ProtectedRoute>
            <PartnershipInquiry />
          </ProtectedRoute>
        } />

        <Route path="/privacy-safety" element={
          <ProtectedRoute>
            <PrivacySafety />
          </ProtectedRoute>
        } />

        <Route path="/about" element={
          <ProtectedRoute>
            <AboutUs />
          </ProtectedRoute>
        } />

        {/* Fallback - redirect to home or login */}
        <Route path="*" element={
          <Navigate to={localStorage.getItem('access_token') ? '/' : '/login'} replace />
        } />
      </Routes>
      </Suspense>
      
      {/* Hide BottomNav when in FullScreen views or login */}
      {!isFullScreenPage && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

// Main App Component with Router Provider
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
