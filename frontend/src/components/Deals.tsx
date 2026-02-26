import { Star, MapPin, Tag, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { getPromotions, Promotion } from '../api/promotions';
import { Store, getStoreImages, StoreImage } from '../api/stores';
import { apiClient } from '../api/client';

interface DealsProps {
  onBack: () => void;
  onSelectSalon: (salon: any) => void;
}

const formatOffer = (promotion: Promotion) => {
  if (promotion.discount_type === 'percentage') {
    return `${promotion.discount_value}% OFF`;
  }
  return `$${promotion.discount_value} OFF`;
};

const formatExpiry = (endAt: string) => {
  const endDate = new Date(endAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Ends today';
  if (diffDays < 7) return `Ends in ${diffDays} days`;
  return `Ends on ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const formatPriceRange = (minPrice?: number | null, maxPrice?: number | null) => {
  if (minPrice == null && maxPrice == null) return 'All prices';
  if (minPrice != null && maxPrice != null) return `$${minPrice} - $${maxPrice}`;
  if (minPrice != null) return `From $${minPrice}`;
  return `Up to $${maxPrice}`;
};

export function Deals({ onBack, onSelectSalon }: DealsProps) {
  const [activeTab, setActiveTab] = useState<'store' | 'platform'>('store');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stores, setStores] = useState<Record<number, Store>>({});
  const [storeImages, setStoreImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDeals = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPromotions({
          active_only: true,
          include_platform: true,
          limit: 100
        });
        if (!mounted) return;
        setPromotions(data);

        const storeIds = Array.from(
          new Set(data.map((promotion) => promotion.store_id).filter((id): id is number => !!id))
        );
        if (storeIds.length === 0) {
          setStores({});
          return;
        }

        const storeList = await apiClient.get<Store[]>(`/api/v1/stores?limit=100`);
        if (!mounted) return;
        const storeMap: Record<number, Store> = {};
        storeList.forEach((store) => {
          if (storeIds.includes(store.id)) {
            storeMap[store.id] = store;
          }
        });
        setStores(storeMap);

        const imagePairs = await Promise.all(
          storeIds.map(async (id) => {
            try {
              const images = await getStoreImages(id);
              if (!images.length) return [id, null] as const;
              const primary = images.find((image) => image.is_primary === 1);
              const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
              const chosen = primary || sorted[0];
              return [id, chosen?.image_url || null] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );

        if (!mounted) return;
        const imageMap: Record<number, string> = {};
        imagePairs.forEach(([id, url]) => {
          if (url) {
            imageMap[id] = url;
          }
        });
        setStoreImages(imageMap);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load deals');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDeals();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredPromotions = useMemo(() => {
    if (activeTab === 'platform') {
      return promotions.filter((promotion) => promotion.scope === 'platform');
    }
    return promotions.filter((promotion) => promotion.scope !== 'platform');
  }, [activeTab, promotions]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-5">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
            Limited-time offers
          </p>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-full text-xs tracking-[0.2em] uppercase border ${
              activeTab === 'store'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-transparent text-gray-400 border-gray-800'
            }`}
          >
            Store Deals
          </button>
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-4 py-2 rounded-full text-xs tracking-[0.2em] uppercase border ${
              activeTab === 'platform'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-transparent text-gray-400 border-gray-800'
            }`}
          >
            Platform Deals
          </button>
        </div>

        {loading && (
          <div className="text-sm text-gray-500">Loading deals...</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && filteredPromotions.length === 0 && (
          <div className="text-sm text-gray-500">No deals available.</div>
        )}

        <div className="space-y-8">
          {filteredPromotions.map((promotion) => {
            const store = promotion.store_id ? stores[promotion.store_id] : undefined;
            const hasStore = !!store;
            const coverImage = (store?.id ? storeImages[store.id] : undefined) || store?.image_url || '';
            const priceRange = promotion.service_rules[0]
              ? formatPriceRange(
                  promotion.service_rules[0].min_price,
                  promotion.service_rules[0].max_price
                )
              : 'Select services';
            const rating = store?.rating ?? null;
            const location = store?.address ?? 'Multiple locations';

            return (
              <motion.div
                key={promotion.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                onClick={() => {
                  if (hasStore) {
                    onSelectSalon(store);
                  }
                }}
                className={`group relative bg-[#111] rounded-3xl overflow-hidden border border-[#D4AF37]/10 transition-all ${
                  hasStore ? 'cursor-pointer hover:border-[#D4AF37]/30 active:scale-[0.98]' : ''
                }`}
              >
                <div className="relative h-56 w-full overflow-hidden">
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={promotion.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#0c0c0c] to-black" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  <div className="absolute top-4 left-4 bg-[#D4AF37] text-black px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {formatOffer(promotion)}
                  </div>

                  <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white/90 text-sm">
                    <MapPin className="w-4 h-4 text-[#D4AF37]" />
                    {location}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium group-hover:text-[#D4AF37] transition-colors">
                        {promotion.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {hasStore ? store?.name : 'Platform Offer'}
                      </p>
                    </div>
                    {rating != null && (
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded-md">
                      {promotion.type}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded-md">
                      {priceRange}
                    </span>
                    {promotion.scope === 'platform' && (
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded-md">
                        Platform
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-[11px] text-[#D4AF37]/80">
                      <Clock className="w-3.5 h-3.5" />
                      {formatExpiry(promotion.end_at)}
                    </div>
                  </div>

                  <button
                    disabled={!hasStore}
                    className={`w-full mt-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 border ${
                      hasStore
                        ? 'bg-white/5 group-hover:bg-[#D4AF37] group-hover:text-black border-white/10 group-hover:border-[#D4AF37]'
                        : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                    }`}
                  >
                    {hasStore ? 'Claim Offer & Book' : 'Platform Offer'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
