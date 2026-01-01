import { Home, Sparkles, Calendar, User, Store, Tag } from 'lucide-react';

interface BottomNavProps {
  currentPage: 'home' | 'services' | 'appointments' | 'profile' | 'deals';
  onNavigate: (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'services' as const, label: 'Book', icon: Store },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar },
    { id: 'deals' as const, label: 'Deals', icon: Tag },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#D4AF37]/20 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-[#D4AF37]' : 'text-gray-500'
                }`}
                fill={isActive ? '#D4AF37' : 'none'}
              />
              <span className={`text-xs transition-colors ${
                isActive ? 'text-[#D4AF37]' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}