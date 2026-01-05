import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home } from './components/Home';
import { Services } from './components/Services';
import { Appointments } from './components/Appointments';
import { Profile } from './components/Profile';
import { BottomNav } from './components/BottomNav';
import { PinDetail } from './components/PinDetail';
import { EditProfile } from './components/EditProfile';
import { OrderHistory } from './components/OrderHistory';
import { MyPoints } from './components/MyPoints';
import { MyCoupons } from './components/MyCoupons';
import { Settings } from './components/Settings';
import { MyGiftCards } from './components/MyGiftCards';
import { Deals } from './components/Deals';
import { VipDescription } from './components/VipDescription';
import { Notifications } from './components/Notifications';
import { BookingFlow } from './components/BookingFlow';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { MyReviews } from './components/MyReviews';
import { MyFavorites } from './components/MyFavorites';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { toast } from 'react-toastify';
import { Sparkles } from 'lucide-react';

export type Page = 'home' | 'services' | 'appointments' | 'profile' | 'deals' | 'notifications' | 'booking' | 'pin-detail' | 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description' | 'login' | 'register' | 'my-reviews' | 'my-favorites';

// Main App Router Component
function AppRouter() {
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [settingsSection, setSettingsSection] = useState<'main' | 'referral' | 'vip'>('main');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isViewingStoreDetails, setIsViewingStoreDetails] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Force clear body overflow on route change to prevent scroll lock
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.removeProperty('overflow');
  }, [location.pathname]);
  
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
    if (path === '/booking') return 'booking';
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/my-reviews') return 'my-reviews';
    if (path === '/my-favorites') return 'my-favorites';
    return 'home';
  };

  const currentPage = getCurrentPage();
  // Hide bottom nav for full-screen pages and when viewing store details in services page
  const isFullScreenPage = currentPage === 'pin-detail' || currentPage === 'edit-profile' || currentPage === 'order-history' || currentPage === 'my-points' || currentPage === 'my-coupons' || currentPage === 'my-gift-cards' || currentPage === 'settings' || currentPage === 'vip-description' || currentPage === 'notifications' || currentPage === 'booking' || currentPage === 'login' || currentPage === 'register' || currentPage === 'my-reviews' || currentPage === 'my-favorites' || (currentPage === 'services' && isViewingStoreDetails);

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
    
    setSelectedPin(pinData);
    navigate('/pin-detail');
  };

  const handleSaveProfile = (newData: { avatar: string }) => {
    navigate('/profile');
  };

  const handleBookingSuccess = (bookingData: any) => {
    setMyBookings([...myBookings, bookingData]);
    navigate('/appointments');
    setSelectedPin(null);
  };

  // Improved scroll management: Restore position for each page independently
  useLayoutEffect(() => {
    const savedPosition = scrollPositions.current[currentPage] || 0;
    window.scrollTo(0, savedPosition);
  }, [currentPage]);

  const handleSelectSalon = (salon: any) => {
    // Save current scroll
    scrollPositions.current[currentPage] = window.scrollY;
    // Navigate directly to the store details page using store ID
    const storeId = salon.id || 1;
    navigate(`/services/${storeId}`);
  };

  return (
    <div className="min-h-screen bg-black pb-[calc(5rem+env(safe-area-inset-bottom))]">
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
                  'my-reviews': '/my-reviews'
                };
                navigate(routeMap[page] || '/profile');
              }}
              onPinClick={(pin) => {
                scrollPositions.current[currentPage] = window.scrollY;
                setSelectedPin(pin);
                navigate('/pin-detail');
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
          <PinDetail 
              onBack={() => navigate('/')} 
              onBookNow={() => {
                navigate('/services');
                toast.info("Style reference added to your booking!", {
                  icon: <Sparkles className="w-4 h-4 text-[#D4AF37]" />,
                  style: { background: '#1a1a1a', border: '1px solid #D4AF3733', color: '#fff' }
                });
              }} 
              pinData={selectedPin}
            />
        } />

        <Route path="/edit-profile" element={
          <EditProfile 
              onBack={() => navigate('/profile')}
              onSave={handleSaveProfile}
            />
        } />

        <Route path="/order-history" element={
          <OrderHistory 
              onBack={() => navigate('/profile')}
            />
        } />

        <Route path="/my-points" element={
          <MyPoints 
              onBack={() => navigate('/profile')}
            />
        } />

        <Route path="/my-coupons" element={
          <MyCoupons 
              onBack={() => navigate('/profile')}
            />
        } />

        <Route path="/my-gift-cards" element={
          <MyGiftCards 
              onBack={() => navigate('/profile')}
            />
        } />

        <Route path="/settings" element={
          <Settings
              initialSection={settingsSection}
              onBack={() => {
                navigate('/profile');
                setSettingsSection('main');
              }}
            />
        } />

        <Route path="/vip-description" element={
          <VipDescription 
              onBack={() => navigate('/profile')}
            />
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications 
              onBack={() => navigate(-1)}
              onNavigate={(page) => navigate(page === 'home' ? '/' : `/${page}`)}
            />
          </ProtectedRoute>
        } />

        <Route path="/booking" element={
          <ProtectedRoute>
            <BookingFlow 
              onBack={() => navigate(-1)}
              onComplete={() => {
                navigate('/appointments');
              }}
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

        {/* Fallback - redirect to home or login */}
        <Route path="*" element={
          <Navigate to={localStorage.getItem('access_token') ? '/' : '/login'} replace />
        } />
      </Routes>
      
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
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
