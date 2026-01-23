import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, MapPin, Star } from 'lucide-react';
import { getMyFavoriteStores, Store, removeStoreFromFavorites } from '../api/stores';
import { toast } from 'react-toastify';

export function MyFavorites() {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritePins, setFavoritePins] = useState<Array<{ id: number; title: string; image_url: string }>>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const rawPins = localStorage.getItem('favorite_pins');
    if (rawPins) {
      try {
        setFavoritePins(JSON.parse(rawPins));
      } catch (error) {
        console.error('Failed to parse favorite pins:', error);
        setFavoritePins([]);
      }
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getMyFavoriteStores(token);
      setStores(data);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (storeId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await removeStoreFromFavorites(storeId, token);
      setStores(stores.filter(s => s.id !== storeId));
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const handleRemoveFavoritePin = (pinId: number) => {
    const updated = favoritePins.filter((pin) => pin.id !== pinId);
    setFavoritePins(updated);
    localStorage.setItem('favorite_pins', JSON.stringify(updated));
    toast.success('Removed from favorites');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-md px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-10 border-b border-[#333]">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">My Favorites</h1>
            <p className="text-sm text-gray-400">
              {stores.length} {stores.length === 1 ? 'salon' : 'salons'} · {favoritePins.length} {favoritePins.length === 1 ? 'design' : 'designs'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {stores.length === 0 && favoritePins.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Favorites Yet</h3>
            <p className="text-gray-400 mb-6">Start adding salons to your favorites!</p>
            <button
              onClick={() => navigate('/services')}
              className="px-6 py-3 bg-[#D4AF37] text-black rounded-xl font-semibold hover:bg-[#b08d2d] transition-colors"
            >
              Browse Salons
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {favoritePins.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Favorite Designs</h2>
                <div className="grid grid-cols-2 gap-3">
                  {favoritePins.map((pin) => (
                    <div
                      key={pin.id}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                    >
                      <button
                        onClick={() => navigate(`/pin-detail?id=${pin.id}`)}
                        className="block w-full"
                      >
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={pin.image_url.startsWith('http') ? pin.image_url : `${apiBaseUrl}${pin.image_url}`}
                            alt={pin.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-white font-semibold line-clamp-2">{pin.title}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleRemoveFavoritePin(pin.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <Heart className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stores.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Favorite Salons</h2>
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-[#D4AF37]/50 transition-all"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Store Image */}
                      {store.image_url && (
                        <div
                          className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/services/${store.id}`)}
                        >
                          <img
                            src={store.image_url}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Store Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-lg font-semibold text-white mb-1 cursor-pointer hover:text-[#D4AF37] transition-colors"
                          onClick={() => navigate(`/services/${store.id}`)}
                        >
                          {store.name}
                        </h3>

                        {store.address && (
                          <p className="text-sm text-gray-400 flex items-start gap-1 mb-2">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{store.address}</span>
                          </p>
                        )}

                        {store.rating && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1 text-[#D4AF37]">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-semibold">{store.rating.toFixed(1)}</span>
                            </div>
                            {store.review_count !== undefined && (
                              <span className="text-gray-400">({store.review_count} reviews)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFavorite(store.id)}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                      >
                        <Heart className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
