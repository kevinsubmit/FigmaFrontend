import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { GiftCard, getGiftCards, issueGiftCardToPhone, revokeGiftCard } from '../api/giftCards';
import { toast } from 'react-toastify';
import { maskPhone } from '../utils/privacy';

const GiftCards: React.FC = () => {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [issueAmount, setIssueAmount] = useState('50');
  const [issueMessage, setIssueMessage] = useState('');
  const [issuing, setIssuing] = useState(false);

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

  const handleIssueGiftCard = async () => {
    const amount = Number.parseInt(issueAmount, 10);
    if (!recipientPhone.trim()) {
      toast.error('Recipient phone is required');
      return;
    }
    if (Number.isNaN(amount) || amount < 1) {
      toast.error('Gift card amount must be at least 1');
      return;
    }
    setIssuing(true);
    try {
      const result = await issueGiftCardToPhone({
        amount,
        recipient_phone: recipientPhone.trim(),
        message: issueMessage.trim() || undefined,
      });
      toast.success(`Gift card issued${result.sms_sent ? ' (SMS sent)' : ''}`);
      setRecipientPhone('');
      setIssueAmount('50');
      setIssueMessage('');
      loadCards();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to issue gift card');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="礼品卡管理" subtitle="查看卡片状态并处理转赠撤销" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gift cards overview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{cards.length} 张礼品卡</h2>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Gift className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issue Gift Card to Phone</p>
          <input
            value={recipientPhone}
            onChange={(event) => setRecipientPhone(event.target.value)}
            placeholder="Recipient phone"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <input
            type="number"
            min={1}
            step={1}
            value={issueAmount}
            onChange={(event) => setIssueAmount(event.target.value)}
            placeholder="Amount"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <input
            value={issueMessage}
            onChange={(event) => setIssueMessage(event.target.value)}
            placeholder="Message (optional)"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <button
            onClick={handleIssueGiftCard}
            disabled={issuing}
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {issuing ? 'Issuing...' : 'Issue Gift Card'}
          </button>
        </div>

        {loading ? (
          <div className="card-surface p-6 text-slate-500">Loading gift cards...</div>
        ) : (
          <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-50">
                <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Card</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Claim Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-t border-blue-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{card.card_number}</td>
                    <td className="px-4 py-3 text-slate-700">${card.balance}</td>
                    <td className="px-4 py-3 text-slate-700">{maskPhone(card.recipient_phone)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {card.claim_expires_at ? new Date(card.claim_expires_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                        {card.status === 'pending_transfer' ? 'pending_transfer (待领取)' : card.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {card.status === 'pending_transfer' && (
                        <button
                          onClick={() => handleRevoke(card.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Revoke Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && cards.length === 0 && (
          <div className="card-surface p-6 text-slate-500 text-sm">No gift cards found.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GiftCards;
