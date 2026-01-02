import { useState, useRef, useLayoutEffect } from 'react';
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
import { LoginTest } from './components/LoginTest';
import { ProtectedRoute } from './components/ProtectedRoute';
import { toast } from 'react-toastify';
import { Sparkles } from 'lucide-react';

export type Page = 'home' | 'services' | 'appointments' | 'profile' | 'deals' | 'pin-detail' | 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description' | 'login';

// Main App Router Component
function AppRouter() {
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [settingsSection, setSettingsSection] = useState<'main' | 'referral' | 'vip'>('main');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isViewingStoreDetails, setIsViewingStoreDetails] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Create a ref to store scroll positions for each page
  const scrollPositions = useRef<Record<string, number>>({});

  // Determine current page from URL
  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/services') return 'services';
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
    if (path === '/login') return 'login';
    return 'home';
  };

  const currentPage = getCurrentPage();
  // Hide bottom nav for full-screen pages and when viewing store details in services page
  const isFullScreenPage = currentPage === 'pin-detail' || currentPage === 'edit-profile' || currentPage === 'order-history' || currentPage === 'my-points' || currentPage === 'my-coupons' || currentPage === 'my-gift-cards' || currentPage === 'settings' || currentPage === 'vip-description' || currentPage === 'login' || (currentPage === 'services' && isViewingStoreDetails);

  const handleNavigate = (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => {
    console.log('handleNavigate called with page:', page);
    // Save current scroll position before navigating
    scrollPositions.current[currentPage] = window.scrollY;
    
    // Reset selectedSalon if navigating to services via bottom nav directly
    if (page === 'services') {
      setSelectedSalon(null);
    }
    
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
          <LoginTest 
            onLoginSuccess={() => navigate('/')}
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
                  'vip-description': '/vip-description'
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
          <ProtectedRoute>
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
          </ProtectedRoute>
        } />

        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile 
              onBack={() => navigate('/profile')}
              onSave={handleSaveProfile}
            />
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
              onBack={() => navigate('/profile')}
            />
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
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
