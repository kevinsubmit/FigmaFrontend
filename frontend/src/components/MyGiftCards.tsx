import { ArrowLeft, Copy, Check, Gift, Clock, Send, Phone, ShieldCheck, QrCode, XCircle, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import giftCardsService, { GiftCard, GiftCardClaimPreview, GiftCardTemplate } from '../services/gift-cards.service';
import { maskPhone } from '../utils/privacy';
import { GiftCardTemplateVisual, renderGiftCardPreviewPayload, renderGiftCardVisualPayload } from './gift-cards/GiftCardTemplateVisual';

interface GiftingData {
  recipientPhone: string;
  amount: number;
  message: string;
}

interface MyGiftCardsProps {
  onBack: () => void;
}

export function MyGiftCards({ onBack }: MyGiftCardsProps) {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [templates, setTemplates] = useState<GiftCardTemplate[]>([]);
  const [isGiftingOpen, setIsGiftingOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('minimal_gold');
  const [isSending, setIsSending] = useState(false);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimPreview, setClaimPreview] = useState<GiftCardClaimPreview | null>(null);
  const [isLoadingClaimPreview, setIsLoadingClaimPreview] = useState(false);
  const [giftData, setGiftData] = useState<GiftingData>({
    recipientPhone: '',
    amount: 0,
    message: ''
  });

  useEffect(() => {
    const loadGiftCards = async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [cards, templateRows] = await Promise.all([
          giftCardsService.getMyGiftCards(token),
          giftCardsService.getTemplates()
        ]);
        setGiftCards(cards);
        setTemplates(templateRows);
      } catch (error) {
        console.error('Failed to load gift cards:', error);
        toast.error('Unable to load gift cards');
      } finally {
        setIsLoading(false);
      }
    };

    loadGiftCards();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const normalizedCode = claimCode.trim();
    if (!isClaimOpen || !token || normalizedCode.length < 6) {
      setClaimPreview(null);
      setIsLoadingClaimPreview(false);
      return;
    }

    let cancelled = false;
    setIsLoadingClaimPreview(true);
    const timer = window.setTimeout(async () => {
      try {
        const preview = await giftCardsService.previewClaimGiftCard(token, normalizedCode);
        if (!cancelled) {
          setClaimPreview(preview);
        }
      } catch {
        if (!cancelled) {
          setClaimPreview(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClaimPreview(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [claimCode, isClaimOpen]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'No expiration';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No expiration';
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const formatPhone = (phone?: string | null) => {
    return maskPhone(phone);
  };

  const normalizeUSPhone = (input: string) => {
    const digits = input.replace(/\D/g, '');
    if (digits.length === 10) return `1${digits}`;
    return digits;
  };

  const totalBalance = useMemo(
    () => giftCards.filter((card) => card.status === 'active').reduce((acc, card) => acc + card.balance, 0),
    [giftCards]
  );

  const sortedCards = useMemo(() => {
    const priority = (status: GiftCard['status']) => {
      if (status === 'pending_transfer') return 0;
      if (status === 'active') return 1;
      if (status === 'revoked') return 2;
      return 3;
    };
    return [...giftCards].sort((a, b) => {
      const statusDiff = priority(a.status) - priority(b.status);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [giftCards]);

  const statusColor = (status: GiftCard['status']) => {
    if (status === 'pending_transfer') return 'text-[#D4AF37]';
    if (status === 'active') return 'text-emerald-400';
    if (status === 'revoked') return 'text-red-400';
    return 'text-gray-500';
  };

  const selectedTemplate =
    templates.find((template) => template.key === selectedTemplateKey) ??
    selectedCard?.template ??
    templates[0] ??
    null;

  const handleCopy = (code: string) => {
    try {
      // Create a temporary textarea to copy text as a fallback for Clipboard API restrictions in some environments
      const textArea = document.createElement("textarea");
      textArea.value = code;
      
      // Ensure the textarea is not visible but part of the DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        toast.success('Card code copied to clipboard');
      } else {
        throw new Error('Copy command was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      // Even if it fails, we show the UI feedback so the user knows where the code is
      toast.error('Could not copy automatically. Please long-press to copy.');
    }
  };

  const handleSendGift = async () => {
    if (!selectedCard) {
      toast.error('Please select a gift card');
      return;
    }

    const rawRecipientPhone = giftData.recipientPhone.trim();
    if (!rawRecipientPhone) {
      toast.error('Please enter recipient phone number');
      return;
    }

    const normalizedRecipientPhone = normalizeUSPhone(rawRecipientPhone);
    if (normalizedRecipientPhone.length !== 11 || !normalizedRecipientPhone.startsWith('1')) {
      toast.error('Please enter a valid US phone number');
      return;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      toast.error('Please sign in to send a gift card');
      return;
    }

    try {
      setIsSending(true);
      const response = await giftCardsService.transferGiftCard(token, selectedCard.id, {
        recipient_phone: normalizedRecipientPhone,
        message: giftData.message || undefined,
        template_key: selectedTemplateKey,
      });
      setGiftCards((prev) => prev.map((card) => (card.id === response.gift_card.id ? response.gift_card : card)));
      setIsGiftingOpen(false);
      toast.success('Gift sent successfully', {
        description: `A ${formatPhone(response.gift_card.recipient_phone)} gift card is pending claim.`,
        style: { background: '#1a1a1a', border: '1px solid #D4AF3733', color: '#fff' }
      });
      setGiftData({ recipientPhone: '', amount: 0, message: '' });
      setSelectedCard(null);
      setSelectedTemplateKey('minimal_gold');
    } catch (error) {
      console.error('Failed to send gift card:', error);
      toast.error('Failed to send gift card');
    } finally {
      setIsSending(false);
    }
  };

  const handleRevoke = async (card: GiftCard) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      toast.error('Please sign in to manage transfers');
      return;
    }

    try {
      const response = await giftCardsService.revokeGiftCard(token, card.id);
      setGiftCards((prev) => prev.map((item) => (item.id === card.id ? response.gift_card : item)));
      toast.success('Transfer canceled', { duration: 1200 });
    } catch (error) {
      console.error('Failed to revoke gift card:', error);
      toast.error('Unable to cancel transfer');
    }
  };

  const handleClaim = async () => {
    if (!claimCode.trim()) {
      toast.error('Please enter a claim code');
      return;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      toast.error('Please sign in to claim a gift card');
      return;
    }

    try {
      setIsClaiming(true);
      const response = await giftCardsService.claimGiftCard(token, claimCode.trim());
      setGiftCards((prev) => {
        const existing = prev.some((card) => card.id === response.gift_card.id);
        if (existing) {
          return prev.map((card) => (card.id === response.gift_card.id ? response.gift_card : card));
        }
        return [response.gift_card, ...prev];
      });
      setIsClaimOpen(false);
      setClaimCode('');
      setClaimPreview(null);
      toast.success('Gift card claimed', { duration: 1200 });
    } catch (error) {
      console.error('Failed to claim gift card:', error);
      toast.error('Unable to claim gift card');
    } finally {
      setIsClaiming(false);
    }
  };

  const renderModalPortal = (content: ReactNode) => {
    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">My Gift Cards</h1>
        <div className="w-8" />
      </div>

      <div className="px-6 py-6">
        {/* Purchased Assets Info */}
        <div className="flex items-center gap-2 mb-6 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Digital Assets Purchased In-Salon
          </p>
        </div>

        {/* Total Balance Summary */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] border border-[#D4AF37]/30 rounded-3xl p-8 mb-10 relative overflow-hidden shadow-2xl group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none group-hover:bg-[#D4AF37]/10 transition-colors duration-700" />
            <div className="relative z-10 flex flex-col items-center">
                <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] mb-3">Total Balance</p>
                <div className="flex items-start gap-1 mb-2">
                    <span className="text-2xl font-bold text-[#D4AF37] mt-1">$</span>
                    <h2 className="text-6xl font-black text-white tracking-tighter">{totalBalance.toFixed(2)}</h2>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-[#333] text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <Check className="w-3 h-3 text-[#D4AF37]" />
                    {giftCards.filter((card) => card.status === 'active').length} Active Cards
                </div>
            </div>
        </div>

        {/* Gift Cards List */}
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">My Collection</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsClaimOpen(true)}
                    className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    <Ticket className="w-3 h-3" /> Claim
                  </button>
                </div>
            </div>

            {isLoading && (
              <div className="py-12 text-center text-xs text-gray-500 uppercase tracking-[0.3em]">
                Loading gift cards...
              </div>
            )}

            {sortedCards.map((card) => (
                <motion.div 
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.01 }}
                    className="overflow-hidden rounded-2xl"
                >
                    <GiftCardTemplateVisual payload={renderGiftCardVisualPayload(card)} />

                    <div className="mt-3 rounded-2xl border border-[#333] bg-[#111] p-5 shadow-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2a2a2a] to-black border border-[#333] flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Store Credit</p>
                                    <p className="text-xl font-black text-white">${card.balance.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Purchased</p>
                                <p className="text-[11px] font-bold text-gray-300">{formatDate(card.created_at)}</p>
                                <span className={`mt-2 inline-flex items-center justify-end text-[9px] font-bold uppercase tracking-[0.2em] ${statusColor(card.status)}`}>
                                  {card.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Card Code Area */}
                            <div className="bg-black border border-[#222] rounded-xl p-3 flex items-center justify-between group">
                                <code className="text-[#D4AF37] font-mono text-sm tracking-wider">{card.card_number}</code>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setShowQRCode(card.card_number)}
                                        className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleCopy(card.card_number)}
                                        className="p-2 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#333] transition-all"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {card.status === 'pending_transfer' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                                  <span>Pending transfer</span>
                                  <span>{formatPhone(card.recipient_phone)}</span>
                                </div>
                                <button
                                  onClick={() => handleRevoke(card)}
                                  className="w-full bg-[#1a1a1a] border border-[#A33] hover:bg-[#3a1111] text-[#ffb4b4] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Cancel transfer
                                </button>
                              </div>
                            )}

                            {card.status === 'active' && (
                              <button
                                onClick={() => {
                                  setSelectedCard(card);
                                  setSelectedTemplateKey(card.template_key || 'minimal_gold');
                                  setGiftData((prev) => ({
                                    ...prev,
                                    amount: card.balance
                                  }));
                                  setIsGiftingOpen(true);
                                }}
                                className="w-full bg-[#1a1a1a] border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Send this card
                              </button>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-gray-600" />
                                    <span className="text-[9px] text-gray-600 font-medium">
                                      {card.status === 'pending_transfer'
                                        ? `Claim by ${formatDate(card.claim_expires_at)}`
                                        : `Valid until ${formatDate(card.expires_at)}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}

            {!isLoading && giftCards.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                <div className="w-20 h-20 bg-[#111] border border-[#222] rounded-full flex items-center justify-center mb-6">
                  <Gift className="w-10 h-10 text-gray-700" />
                </div>
                <h3 className="text-white font-bold mb-2">No active cards</h3>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Purchase gift cards at any of our salon locations to see them appear here in your digital collection.
                </p>
              </div>
            )}
        </div>

        {/* Info Box */}
        <div className="mt-10 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
                <h4 className="text-[#D4AF37] font-black text-xs uppercase tracking-widest mb-1">In-Store Redemption</h4>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                    This is a <span className="text-white font-bold">Store Credit</span> card. Simply show your code or QR code to the receptionist during checkout. The amount will be deducted from your final bill.
                </p>
            </div>
        </div>
      </div>

      {/* QR Code Overlay */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRCode(null)}
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] mb-8 shadow-[0_20px_60px_rgba(212,175,55,0.3)]"
            >
                {/* Simulated QR Code Component */}
                <div className="w-64 h-64 bg-black flex items-center justify-center relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-2 border-4 border-white opacity-20" />
                    <QrCode className="w-48 h-48 text-white" strokeWidth={1} />
                    {/* Scanning animation line */}
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="absolute left-0 right-0 h-0.5 bg-[#D4AF37] shadow-[0_0_15px_#D4AF37] z-10"
                    />
                </div>
            </motion.div>
            
            <div className="text-center">
                <p className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.3em] mb-2">Checkout Pass</p>
                <code className="text-3xl font-black text-white tracking-[0.2em] mb-4 block">{showQRCode}</code>
                <p className="text-gray-500 text-sm max-w-[240px] mx-auto">
                    Show this to your nail technician after your service to apply the credit.
                </p>
            </div>
            
            <button className="mt-12 text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Tap anywhere to close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gifting Modal/Drawer Overlay */}
      {isGiftingOpen &&
        renderModalPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[220] bg-black/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#111] text-white sm:mx-auto sm:my-6 sm:h-[min(920px,calc(100dvh-3rem))] sm:max-w-2xl sm:rounded-[2.25rem] sm:border sm:border-[#333] sm:shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
            >
              <div
                className="border-b border-[#232323] px-4 pb-4 pt-4 sm:px-8"
                style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
              >
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#333] sm:hidden" />

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setIsGiftingOpen(false);
                      setSelectedTemplateKey(selectedCard?.template_key ?? 'minimal_gold');
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#333] bg-[#1a1a1a] shadow-lg transition-all hover:bg-[#252525] active:scale-90"
                  >
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-[1.75rem] font-black uppercase leading-none tracking-tight text-white sm:text-3xl">Send a Gift</h2>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#D4AF37]">Luxury Digital Experience</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">Choose a style</p>
                      <p className="text-[11px] text-gray-500">The recipient will see this same gift card design.</p>
                    </div>
                    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
                      {templates.map((template) => (
                        <button
                          key={template.key}
                          onClick={() => setSelectedTemplateKey(template.key)}
                          className={`w-[160px] shrink-0 snap-start rounded-2xl border p-3 text-left transition-all ${selectedTemplateKey === template.key ? 'border-[#D4AF37] bg-[#1a1a1a]' : 'border-[#333] bg-black hover:border-[#555]'}`}
                        >
                          <div
                            className="mb-3 h-20 rounded-xl"
                            style={{
                              background: `linear-gradient(135deg, ${template.background_start_hex} 0%, ${template.background_end_hex} 100%)`,
                              boxShadow: `inset 0 0 0 1px ${template.accent_start_hex}30`,
                            }}
                          />
                          <p className="text-xs font-black uppercase tracking-wider text-white">{template.name}</p>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-gray-500">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCard && selectedTemplate && (
                    <GiftCardTemplateVisual
                      payload={{
                        balance: selectedCard.balance,
                        template: selectedTemplate,
                        message: giftData.message,
                        badge: 'Gift preview',
                      }}
                      className="min-h-[210px] sm:min-h-[230px]"
                    />
                  )}

                  <div className="space-y-4">
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-[#D4AF37]" />
                      <input
                        type="text"
                        placeholder="Recipient Phone"
                        value={giftData.recipientPhone}
                        onChange={(e) => setGiftData({ ...giftData, recipientPhone: e.target.value })}
                        className="w-full rounded-2xl border border-[#333] bg-black py-4 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-600 focus:border-[#D4AF37]"
                      />
                    </div>

                    <textarea
                      placeholder="Add a personal message (Optional)"
                      rows={4}
                      value={giftData.message}
                      onChange={(e) => setGiftData({ ...giftData, message: e.target.value })}
                      className="min-h-[130px] w-full resize-none rounded-2xl border border-[#333] bg-black p-4 text-white outline-none transition-all placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div
                className="border-t border-[#232323] bg-[#111]/95 px-4 pb-16 pt-4 backdrop-blur-xl sm:px-8 sm:pb-4"
                style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 1rem) + 4.5rem)' }}
              >
                <button
                  disabled={isSending}
                  onClick={handleSendGift}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#D4AF37] py-5 font-black uppercase text-black shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all hover:bg-[#b5952f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 rounded-full border-2 border-black/20 border-t-black"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Digital Gift Card
                    </>
                  )}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1 text-center text-[9px] font-bold uppercase text-gray-600">
                  <ShieldCheck className="h-3 w-3" /> Secure Payment Powered by GlamPay
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

      {/* Claim Modal */}
      {isClaimOpen &&
        renderModalPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[225] bg-black/90 backdrop-blur-xl flex items-end"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 1rem)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
              paddingLeft: '1rem',
              paddingRight: '1rem',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-h-[88vh] overflow-y-auto overscroll-contain rounded-[2.25rem] border border-[#333] bg-[#111] p-6 pb-8 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] sm:mx-auto sm:max-w-2xl sm:p-8"
            >
              <div className="w-12 h-1.5 bg-[#333] rounded-full mx-auto mb-8" />
              <div className="flex items-center gap-5 mb-8">
                <button
                  onClick={() => {
                    setIsClaimOpen(false);
                    setClaimPreview(null);
                    setClaimCode('');
                  }}
                  className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:bg-[#252525] active:scale-90 transition-all shadow-lg"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Claim a Gift</h2>
                  <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mt-1">Enter your code</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="relative group">
                  <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                  <input
                    type="text"
                    placeholder="Claim Code"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                    className="w-full bg-black border border-[#333] focus:border-[#D4AF37] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none transition-all tracking-widest"
                  />
                </div>
                {claimPreview ? (
                  <GiftCardTemplateVisual
                    payload={renderGiftCardPreviewPayload(claimPreview)}
                    className="min-h-[220px]"
                  />
                ) : isLoadingClaimPreview ? (
                  <div className="rounded-2xl border border-[#333] bg-[#0f0f0f] px-4 py-8 text-center text-[11px] uppercase tracking-[0.24em] text-gray-500">
                    Loading preview...
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#333] bg-[#0f0f0f] px-4 py-5 text-[11px] leading-relaxed text-gray-500">
                    Enter the claim code from your gift message to preview the card style before claiming it.
                  </div>
                )}
                <button
                  disabled={isClaiming}
                  onClick={handleClaim}
                  className="w-full bg-[#D4AF37] hover:bg-[#b5952f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.3)] active:scale-[0.98]"
                >
                  {isClaiming ? 'Claiming...' : 'Claim Gift Card'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
    </div>
  );
}
