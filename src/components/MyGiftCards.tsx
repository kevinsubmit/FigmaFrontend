import { ArrowLeft, Copy, Check, Info, CreditCard, Plus, ChevronRight, Gift, Clock, Send, Mail, User, ShieldCheck, QrCode } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface GiftingData {
  recipientEmail: string;
  recipientName: string;
  amount: number;
  message: string;
}

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  originalValue: number;
  expiryDate: string;
  status: 'active' | 'expired';
  lastUsed?: string;
  purchaseDate: string; // Added to show it was bought at salon
}

const INITIAL_GIFT_CARDS: GiftCard[] = [
  {
    id: '1',
    code: 'GLAM-8829-9912',
    balance: 50.00,
    originalValue: 50.00,
    expiryDate: 'Dec 31, 2026',
    status: 'active',
    purchaseDate: 'Nov 12, 2025'
  },
  {
    id: '2',
    code: 'GOLD-1102-5543',
    balance: 100.00,
    originalValue: 100.00,
    expiryDate: 'Oct 15, 2025',
    status: 'active',
    purchaseDate: 'Dec 05, 2025'
  }
];

interface MyGiftCardsProps {
  onBack: () => void;
}

export function MyGiftCards({ onBack }: MyGiftCardsProps) {
  const [giftCards, setGiftCards] = useState<GiftCard[]>(INITIAL_GIFT_CARDS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGiftingOpen, setIsGiftingOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [giftData, setGiftData] = useState<GiftingData>({
    recipientEmail: '',
    recipientName: '',
    amount: 50,
    message: ''
  });

  const handleCopy = (code: string, id: string) => {
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
        setCopiedId(id);
        toast.success('Card code copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        throw new Error('Copy command was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      // Even if it fails, we show the UI feedback so the user knows where the code is
      setCopiedId(id);
      toast.error('Could not copy automatically. Please long-press to copy.');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const totalBalance = giftCards.reduce((acc, card) => acc + card.balance, 0);

  const handleSendGift = () => {
    if (!giftData.recipientEmail || !giftData.recipientName) {
      toast.error('Please fill in recipient details');
      return;
    }
    
    setIsSending(true);
    // Simulate API call and Ownership Transfer
    setTimeout(() => {
      setIsSending(false);
      setIsGiftingOpen(false);
      
      // Transfer logic: Remove the card from the user's list after sending
      if (selectedCardId) {
        setGiftCards(prev => prev.filter(c => c.id !== selectedCardId));
      }
      
      toast.success(`Gift Sent Successfully!`, {
        description: `Your $${giftData.amount} card has been transferred to ${giftData.recipientName}.`,
        style: { background: '#1a1a1a', border: '1px solid #D4AF3733', color: '#fff' }
      });
      setGiftData({ recipientEmail: '', recipientName: '', amount: 50, message: '' });
      setSelectedCardId(null);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-12 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-md px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-20 border-b border-[#333] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#333] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">My Gift Cards</h1>
        </div>
        {/* Removed Plus button as requested to maintain exclusive asset logic */}
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
                    {giftCards.length} Active Cards
                </div>
            </div>
        </div>

        {/* Gift Cards List */}
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">My Collection</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase">
                    {giftCards.length} Items
                </div>
            </div>

            {giftCards.map((card) => (
                <motion.div 
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-xl"
                >
                    {/* Visual Card Top */}
                    <div className="h-3 bg-gradient-to-r from-[#D4AF37] to-[#8c7325]" />
                    
                    <div className="p-5">
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
                                <p className="text-[11px] font-bold text-gray-300">{card.purchaseDate}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Card Code Area */}
                            <div className="bg-black border border-[#222] rounded-xl p-3 flex items-center justify-between group">
                                <code className="text-[#D4AF37] font-mono text-sm tracking-wider">{card.code}</code>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setShowQRCode(card.code)}
                                        className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all"
                                    >
                                        <QrCode className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleCopy(card.code, card.id)}
                                        className="p-2 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#333] transition-all"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Actions: Send to Friend */}
                            <button 
                                onClick={() => {
                                  setSelectedCardId(card.id);
                                  setGiftData({ ...giftData, amount: card.balance });
                                  setIsGiftingOpen(true);
                                }}
                                className="w-full bg-[#1a1a1a] border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-black text-[#D4AF37] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                            >
                                <Send className="w-3.5 h-3.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Send to a Friend
                            </button>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-gray-600" />
                                    <span className="text-[9px] text-gray-600 font-medium">Valid until {card.expiryDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}

            {giftCards.length === 0 && (
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
      <AnimatePresence>
        {isGiftingOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-6 flex flex-col justify-end"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#111] border border-[#333] rounded-t-[2.5rem] p-8 -mx-6 -mb-6 pb-12 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
            >
              <div className="w-12 h-1.5 bg-[#333] rounded-full mx-auto mb-8" />
              
              <div className="flex items-center gap-5 mb-8">
                <button 
                  onClick={() => setIsGiftingOpen(false)}
                  className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:bg-[#252525] active:scale-90 transition-all shadow-lg"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">Send a Gift</h2>
                  <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mt-1">Luxury Digital Experience</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Amount Display (Non-editable) */}
                <div className="bg-black border border-[#D4AF37]/30 rounded-2xl p-6 flex flex-col items-center shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]">
                  <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] mb-2">Transfer Amount</p>
                  <div className="flex items-start gap-1">
                    <span className="text-xl font-bold text-[#D4AF37] mt-1">$</span>
                    <h3 className="text-5xl font-black text-white tracking-tighter italic">{giftData.amount.toFixed(2)}</h3>
                  </div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-3 opacity-60">Full Balance Transfer Only</p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                    <input 
                      type="text"
                      placeholder="Recipient Name"
                      value={giftData.recipientName}
                      onChange={(e) => setGiftData({ ...giftData, recipientName: e.target.value })}
                      className="w-full bg-black border border-[#333] focus:border-[#D4AF37] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none transition-all"
                    />
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
                    <input 
                      type="email"
                      placeholder="Recipient Email"
                      value={giftData.recipientEmail}
                      onChange={(e) => setGiftData({ ...giftData, recipientEmail: e.target.value })}
                      className="w-full bg-black border border-[#333] focus:border-[#D4AF37] rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 outline-none transition-all"
                    />
                  </div>

                  <textarea 
                    placeholder="Add a personal message (Optional)"
                    rows={3}
                    value={giftData.message}
                    onChange={(e) => setGiftData({ ...giftData, message: e.target.value })}
                    className="w-full bg-black border border-[#333] focus:border-[#D4AF37] rounded-2xl p-4 text-white placeholder:text-gray-600 outline-none transition-all resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isSending}
                    onClick={handleSendGift}
                    className="w-full bg-[#D4AF37] hover:bg-[#b5952f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(212,175,55,0.3)] active:scale-[0.98]"
                  >
                    {isSending ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }} 
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Digital Gift Card
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-gray-600 text-center mt-4 uppercase font-bold flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Secure Payment Powered by GlamPay
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}