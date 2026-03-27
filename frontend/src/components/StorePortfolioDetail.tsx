import { ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import type { PortfolioItem } from '../services/store-portfolio.service';
import { resolveAssetUrl } from '../utils/assetUrl';

interface StorePortfolioDetailProps {
  items: PortfolioItem[];
  initialIndex: number;
  onClose: () => void;
  onBookServices: () => void;
}

export function StorePortfolioDetail({
  items,
  initialIndex,
  onClose,
  onBookServices,
}: StorePortfolioDetailProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    setSelectedIndex(initialIndex);
  }, [initialIndex]);

  const currentItem = useMemo(() => {
    if (items.length === 0) return null;
    const safeIndex = Math.min(Math.max(selectedIndex, 0), items.length - 1);
    return items[safeIndex];
  }, [items, selectedIndex]);

  const counterText = items.length === 0 ? '0/0' : `${Math.min(selectedIndex + 1, items.length)}/${items.length}`;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed inset-0 z-[140] bg-black"
      >
        <div className="flex h-full flex-col bg-black">
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white/90">
              {counterText}
            </div>

            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {currentItem ? (
              <>
                <div className="mx-auto h-[min(68vh,560px)] w-full max-w-5xl px-4">
                  <img
                    src={resolveAssetUrl(currentItem.image_url)}
                    alt={currentItem.title || 'Portfolio image'}
                    className="h-full w-full object-contain"
                  />
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
                <ImageIcon className="h-8 w-8" />
                <p className="text-sm">Portfolio image unavailable.</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#111111]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              onClick={onBookServices}
              className="w-full rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-[#c39f22]"
            >
              Book Services
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
    ,
    document.body
  );
}
