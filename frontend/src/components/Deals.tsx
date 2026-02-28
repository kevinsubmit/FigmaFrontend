import { Star, MapPin, Tag, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { getPromotions, Promotion } from '../api/promotions';
import { Store, getStoreImages, StoreImage } from '../api/stores';
import { apiClient } from '../api/client';
import { resolveAssetUrl } from '../utils/assetUrl';

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

        const storesNeedingImageFetch = storeIds.filter((id) => {
          const hasPromotionImage = data.some((promotion) => promotion.store_id === id && !!promotion.image_url);
          const hasStoreImage = !!storeMap[id]?.image_url;
          return !hasPromotionImage && !hasStoreImage;
        });

        if (storesNeedingImageFetch.length === 0) {
          setStoreImages({});
          return;
        }

        const imagePairs = await Promise.all(
          storesNeedingImageFetch.map(async (id) => {
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
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-lg">
        <div className="px-5 pt-4 pb-4">
          <h1 className="text-[38px] leading-[1.05] font-bold tracking-tight text-white">
            Limited-time offers
          </h1>
          <div className="mt-4 rounded-2xl border border-[#D4AF37]/16 bg-white/[0.04] p-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('store')}
                className={`h-11 flex-1 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'store'
                    ? 'bg-[#D4AF37] text-black'
                    : 'border border-[#D4AF37]/25 bg-transparent text-white/80'
                }`}
              >
                Store Deals
              </button>
              <button
                onClick={() => setActiveTab('platform')}
                className={`h-11 flex-1 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'platform'
                    ? 'bg-[#D4AF37] text-black'
                    : 'border border-[#D4AF37]/25 bg-transparent text-white/80'
                }`}
              >
                Platform Deals
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 pt-5 space-y-5">
        {loading && (
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#141414] px-5 py-6 text-sm text-gray-400">
            Loading deals...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-red-500/35 bg-red-500/10 px-5 py-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && filteredPromotions.length === 0 && (
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#141414] px-5 py-9 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10">
              <Tag className="h-7 w-7 text-[#D4AF37]" />
            </div>
            <p className="text-xl font-semibold text-white/90">No active deals right now</p>
            <p className="mt-2 text-sm text-gray-400">Check back soon for new offers.</p>
          </div>
        )}

        <div className="space-y-5">
          {filteredPromotions.map((promotion) => {
            const store = promotion.store_id ? stores[promotion.store_id] : undefined;
            const hasStore = !!store;
            const coverImage =
              promotion.image_url ||
              (store?.id ? storeImages[store.id] : undefined) ||
              store?.image_url ||
              '';
            const coverImageUrl = resolveAssetUrl(coverImage);
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
                className={`group relative overflow-hidden rounded-[26px] border border-[#D4AF37]/18 bg-[#141414] shadow-[0_8px_28px_rgba(0,0,0,0.32)] transition-all ${
                  hasStore ? 'cursor-pointer hover:border-[#D4AF37]/30 active:scale-[0.98]' : ''
                }`}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '420px',
                }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#D4AF37]/45" />

                <div className="relative w-full overflow-hidden" style={{ height: '168px' }}>
                  {coverImageUrl ? (
                    <img
                      src={coverImageUrl}
                      alt={promotion.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#2d220a] via-[#161616] to-black" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent" />

                  <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-3 py-1.5 text-xs font-bold text-black shadow-lg">
                    <Tag className="w-3.5 h-3.5" />
                    {formatOffer(promotion)}
                  </div>

                  {rating != null && (
                    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-xl border border-white/10 bg-black/45 px-2.5 py-1.5">
                      <Star className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-xl font-bold text-white transition-colors group-hover:text-[#D4AF37]">
                        {promotion.title}
                      </h3>
                      <p className="mt-1 truncate text-sm font-medium text-white/75">
                        {hasStore ? store?.name : 'Platform Offer'}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70">
                      {hasStore ? 'STORE DEAL' : 'PLATFORM DEAL'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-white/75">
                    <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {formatExpiry(promotion.end_at)}
                  </div>

                  {hasStore && (
                    <div className="flex items-start gap-1.5 text-sm text-white/70">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                      <span className="whitespace-normal break-words">{location}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/72">
                      {priceRange}
                    </span>
                    <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/65">
                      {promotion.type}
                    </span>
                    {promotion.scope === 'platform' && (
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/65">
                        Platform
                      </span>
                    )}
                  </div>

                  {promotion.rules && promotion.rules.trim() && (
                    <p className="line-clamp-3 text-sm text-white/62">{promotion.rules}</p>
                  )}

                  <button
                    disabled={!hasStore}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!hasStore || !store) return;
                      onSelectSalon(store);
                    }}
                    className={`w-full mt-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 border ${
                      hasStore
                        ? 'border-[#D4AF37] bg-[#D4AF37] text-black hover:brightness-105'
                        : 'cursor-not-allowed border-[#D4AF37]/30 bg-white/[0.04] text-[#D4AF37]/55'
                    }`}
                  >
                    {hasStore ? 'Book Now' : 'Browse Stores'}
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
