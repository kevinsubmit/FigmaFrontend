import { useState, useRef, useLayoutEffect } from 'react';
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
import { toast } from 'react-toastify';
import { Sparkles } from 'lucide-react';

export type Page = 'home' | 'services' | 'appointments' | 'profile' | 'deals' | 'pin-detail' | 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [selectedSalon, setSelectedSalon] = useState<any>(null);
  const [settingsSection, setSettingsSection] = useState<'main' | 'referral' | 'vip'>('main');
  const [myBookings, setMyBookings] = useState<any[]>([]);
  
  // Create a ref to store scroll positions for each page
  const scrollPositions = useRef<Record<string, number>>({});
  const prevPageRef = useRef<Page>(currentPage);

  const isFullScreenPage = currentPage === 'pin-detail' || currentPage === 'edit-profile' || currentPage === 'order-history' || currentPage === 'my-points' || currentPage === 'my-coupons' || currentPage === 'my-gift-cards' || currentPage === 'settings' || currentPage === 'vip-description';

  const handleNavigate = (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => {
    // Save current scroll position before navigating
    scrollPositions.current[currentPage] = window.scrollY;
    
    // Reset selectedSalon if navigating to services via bottom nav directly
    if (page === 'services') {
      setSelectedSalon(null);
    }
    setCurrentPage(page);
  };

  const handlePinClick = (pinData: any) => {
    // Save scroll position
    scrollPositions.current[currentPage] = window.scrollY;
    
    setSelectedPin(pinData);
    setCurrentPage('pin-detail');
  };

  const handleSaveProfile = (newData: { avatar: string }) => {
    setCurrentPage('profile');
  };

  const handleBookingSuccess = (bookingData: any) => {
    setMyBookings([...myBookings, bookingData]);
    setCurrentPage('appointments');
    setSelectedPin(null);
  };

  // Improved scroll management: Restore position for each page independently
  useLayoutEffect(() => {
    const savedPosition = scrollPositions.current[currentPage] || 0;
    
    // If we're entering a "Flow" or "Detail" for the first time, we usually want top
    // but the logic below covers general persistence.
    window.scrollTo(0, savedPosition);
    
    // Cleanup/Track prev page
    return () => {
      // We don't save here because the state has already changed
    };
  }, [currentPage]);

  const handleSelectSalon = (salon: any) => {
    // Save current scroll (usually from Deals)
    scrollPositions.current[currentPage] = window.scrollY;
    // Convert to a format that matches Services component's expected store structure
    const mockStore = {
      id: salon.id || 1,
      name: salon.name,
      rating: salon.rating,
      reviewCount: salon.reviews,
      distance: "1.2 mi",
      address: salon.location,
      coverImage: salon.image,
      thumbnails: [
        "https://images.unsplash.com/photo-1673985402265-46c4d2e53982?w=400&q=80",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
        "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80",
        "https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=400&q=80"
      ]
    };
    setSelectedSalon(mockStore);
    setCurrentPage('services');
  };

  return (
    <div className="min-h-screen bg-black pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* 
          Keep main tabs mounted to preserve their internal state (like filters/input), 
          but hide them visually when not active. 
      */}
      <div style={{ display: currentPage === 'home' ? 'block' : 'none' }}>
        <Home 
          onNavigate={handleNavigate} 
          onPinClick={handlePinClick}
        />
      </div>

      <div style={{ display: currentPage === 'services' ? 'block' : 'none' }}>
        <Services 
          onBookingSuccess={handleBookingSuccess}
          initialSelectedStore={selectedSalon}
        />
      </div>

      <div style={{ display: currentPage === 'appointments' ? 'block' : 'none' }}>
        <Appointments 
          newBooking={myBookings[myBookings.length - 1]} 
          onClearNewBooking={() => setMyBookings(myBookings.slice(0, -1))} 
          onNavigate={handleNavigate}
        />
      </div>
      
      <div style={{ display: currentPage === 'profile' ? 'block' : 'none' }}>
        <Profile 
          onNavigate={(page, sub) => {
            scrollPositions.current[currentPage] = window.scrollY; // Save before sub-nav
            if (page === 'settings' && sub) {
              setSettingsSection(sub as any);
            } else {
              setSettingsSection('main');
            }
            setCurrentPage(page as any);
          }}
          onPinClick={(pin) => {
            scrollPositions.current[currentPage] = window.scrollY;
            setSelectedPin(pin);
            setCurrentPage('pin-detail');
          }}
        />
      </div>

      <div style={{ display: currentPage === 'deals' ? 'block' : 'none' }}>
        <Deals 
          onBack={() => handleNavigate('home')}
          onSelectSalon={handleSelectSalon}
        />
      </div>
      
      {/* Sub-pages / Overlays */}
      {currentPage === 'pin-detail' && (
        <PinDetail 
          onBack={() => handleNavigate('home')} 
          onBookNow={() => {
            // Passing the selected style as a reference for the booking
            handleNavigate('services', { styleReference: selectedPin?.url });
            toast.info("Style reference added to your booking!", {
              icon: <Sparkles className="w-4 h-4 text-[#D4AF37]" />,
              style: { background: '#1a1a1a', border: '1px solid #D4AF3733', color: '#fff' }
            });
          }} 
          pinData={selectedPin}
        />
      )}

      {currentPage === 'edit-profile' && (
        <EditProfile 
            onBack={() => setCurrentPage('profile')}
            onSave={handleSaveProfile}
        />
      )}

      {currentPage === 'order-history' && (
        <OrderHistory 
            onBack={() => setCurrentPage('profile')}
        />
      )}

      {currentPage === 'my-points' && (
        <MyPoints 
            onBack={() => setCurrentPage('profile')}
        />
      )}

      {currentPage === 'my-coupons' && (
        <MyCoupons 
            onBack={() => setCurrentPage('profile')}
        />
      )}

      {currentPage === 'my-gift-cards' && (
        <MyGiftCards 
            onBack={() => setCurrentPage('profile')}
        />
      )}

      {currentPage === 'settings' && (
        <Settings
            initialSection={settingsSection}
            onBack={() => {
              setCurrentPage('profile');
              setSettingsSection('main');
            }}
        />
      )}

      {currentPage === 'vip-description' && (
        <VipDescription 
            onBack={() => setCurrentPage('profile')}
        />
      )}
      
      {/* Hide BottomNav when in FullScreen views */}
      {!isFullScreenPage && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  );
}