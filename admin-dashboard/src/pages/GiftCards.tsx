import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { GiftCard, getGiftCards, revokeGiftCard } from '../api/giftCards';
import { toast } from 'react-toastify';

const GiftCards: React.FC = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = async () => {
    setLoading(true);
    try {
      const data = await getGiftCards({ limit: 100 });
      setCards(data);
    } catch (error) {
      toast.error('Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const handleRevoke = async (id: number) => {
    try {
      await revokeGiftCard(id);
      toast.success('Gift card revoked');
      loadCards();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to revoke');
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Gift Cards" />
      <div className="px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-gray-500">Loading gift cards...</div>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="card-surface p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{card.card_number}</h3>
                <span className="badge">{card.status}</span>
              </div>
              <p className="text-sm text-gray-500">Balance: ${card.balance}</p>
              <p className="text-xs text-gray-500">Recipient: {card.recipient_phone || 'N/A'}</p>
              {card.status === 'pending_transfer' && (
                <button
                  onClick={() => handleRevoke(card.id)}
                  className="mt-2 rounded-xl border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-200"
                >
                  Revoke Transfer
                </button>
              )}
            </div>
          ))
        )}
        {!loading && cards.length === 0 && (
          <div className="text-gray-500 text-sm">No gift cards found.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GiftCards;
