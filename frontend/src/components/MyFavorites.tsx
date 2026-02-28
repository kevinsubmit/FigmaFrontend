import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, Star } from 'lucide-react';
import { getMyFavoriteStores, getStoreImages, Store, StoreImage, removeStoreFromFavorites } from '../api/stores';
import { getMyFavoritePins, Pin, removePinFromFavorites } from '../api/pins';
import { toast } from 'react-toastify';
import { resolveAssetUrl } from '../utils/assetUrl';

export function MyFavorites() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritePins, setFavoritePins] = useState<Pin[]>([]);
  const [favoriteStoreImages, setFavoriteStoreImages] = useState<Record<number, string>>({});

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setStores([]);
      setFavoritePins([]);
      setFavoriteStoreImages({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [storeData, pinData] = await Promise.all([
        getMyFavoriteStores(token),
        getMyFavoritePins(token)
      ]);
      setStores(storeData);
      setFavoritePins(pinData);
      const storeImageEntries = await Promise.allSettled(
        storeData.map(async (store) => {
          const images = await getStoreImages(store.id);
          return [store.id, pickStoreImage(images)] as const;
        }),
      );

      const nextImageMap: Record<number, string> = {};
      storeImageEntries.forEach((entry) => {
        if (entry.status !== 'fulfilled') return;
        const [storeID, imageURL] = entry.value;
        if (!imageURL) return;
        nextImageMap[storeID] = imageURL;
      });
      setFavoriteStoreImages(nextImageMap);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (storeId: number) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) return;

    try {
      await removeStoreFromFavorites(storeId, token);
      setStores((prev) => prev.filter((s) => s.id !== storeId));
      setFavoriteStoreImages((prev) => {
        const next = { ...prev };
        delete next[storeId];
        return next;
      });
      toast.success('Removed from favorites');
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      toast.error('Failed to remove favorite');
    }
  };

  const pickStoreImage = (images: StoreImage[]): string => {
    if (!Array.isArray(images) || images.length === 0) return '';
    const sorted = [...images].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return b.is_primary - a.is_primary;
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.id - b.id;
    });
    return sorted[0]?.image_url || '';
  };

  const resolveStoreImage = (store: Store) => {
    const fromImages = favoriteStoreImages[store.id];
    if (fromImages) return resolveAssetUrl(fromImages);
    return resolveAssetUrl(store.image_url);
  };

  const handleRemoveFavoritePin = (pinId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    removePinFromFavorites(pinId, token)
      .then(() => {
        setFavoritePins(favoritePins.filter((pin) => pin.id !== pinId));
        toast.success('Removed from favorites');
      })
      .catch((error) => {
        console.error('Failed to remove favorite pin:', error);
        toast.error('Failed to remove favorites');
      });
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
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">My Favorites</h1>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="mb-4 text-sm text-gray-400">
          {stores.length} {stores.length === 1 ? 'salon' : 'salons'} · {favoritePins.length} {favoritePins.length === 1 ? 'design' : 'designs'}
        </div>
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
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '260px' }}
                    >
                      <button
                        onClick={() => navigate(`/pin-detail?id=${pin.id}`)}
                        className="block w-full"
                      >
                        <div className="aspect-[3/4] overflow-hidden">
                          <img
                            src={resolveAssetUrl(pin.image_url)}
                            alt={pin.title}
                            loading="lazy"
                            decoding="async"
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
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '180px' }}
                  >
                    <div className="flex gap-4 p-4">
                      {/* Store Image */}
                      <div
                        className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-white/10"
                        onClick={() => navigate(`/services/${store.id}`)}
                      >
                        {resolveStoreImage(store) ? (
                          <img
                            src={resolveStoreImage(store)}
                            alt={store.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                        )}
                      </div>

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
