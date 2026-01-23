import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Gift, Share2, Star, CheckCircle2, Users } from 'lucide-react';
import referralService, { ReferralStats, ReferralListItem } from '../services/referral.service';

const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralList, setReferralList] = useState<ReferralListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codeData, statsData, listData] = await Promise.all([
        referralService.getMyReferralCode(),
        referralService.getReferralStats(),
        referralService.getReferralList()
      ]);
      
      setReferralCode(codeData.referral_code);
      setStats(statsData);
      setReferralList(listData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, notice: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyNotice(notice);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setCopyNotice('');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const copyReferralCode = () => {
    if (!referralCode) return;
    copyText(referralCode, 'Referral code copied');
  };

  const shareReferral = async () => {
    const shareUrl = `${window.location.origin}/register?ref=${referralCode}`;
    const shareText = `Join me on Nails Booking! Use my referral code ${referralCode} and get $10 off your first booking!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invite Friends to Nails Booking',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled or error occurred
        copyText(shareUrl, 'Share link copied');
      }
    } else {
      copyText(shareUrl, 'Share link copied');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (item: ReferralListItem) => {
    if (item.referrer_reward_given) {
      return (
        <span className="flex items-center gap-1 text-green-400 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> Rewarded
        </span>
      );
    }
    return (
      <span className="text-yellow-500 text-xs">
        ⏳ Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const totalReferrals = stats?.total_referrals ?? 0;
  const totalRewards = stats?.total_rewards_earned ?? 0;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">Refer a Friend</h1>
        <div className="w-8" />
      </div>

      <div className="px-6 py-8">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Gift className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Refer a Friend</h2>
          <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
            Share the glow! Both you and your friend will receive{' '}
            <span className="text-[#D4AF37] font-bold">1 Free Coupon ($10 value)</span>{' '}
            after their first booking.
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-3xl p-6 mb-8 text-center">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-4">Your Referral Code</p>
          <div className="bg-black border border-[#333] p-4 rounded-2xl flex items-center justify-between">
            <span className="text-2xl font-bold tracking-[0.3em] text-[#D4AF37] ml-2">{referralCode || '—'}</span>
            <button 
              onClick={copyReferralCode}
              className="w-12 h-12 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              aria-label="Copy referral code"
            >
              {copied ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Your code is unique and stays the same.
          </p>
          {copyNotice && (
            <p className="text-xs text-[#D4AF37] mt-3">{copyNotice}</p>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={shareReferral}
            className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share with Friends
          </button>
          <div className="flex items-center gap-4 py-2 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalReferrals} Referrals</span>
            <span className="h-1 w-1 bg-gray-700 rounded-full" />
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#D4AF37]" /> {totalRewards} Coupons Earned</span>
          </div>
        </div>

        {referralList.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Referral History</h3>
            <div className="space-y-3">
              {referralList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-[#111] border border-[#222] rounded-2xl"
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.referee_name}</p>
                    <p className="text-sm text-gray-500">{item.referee_phone}</p>
                    <p className="text-xs text-gray-600 mt-1">Joined: {formatDate(item.created_at)}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(item)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {referralList.length === 0 && (
          <div className="mt-8 bg-[#111] border border-[#222] rounded-2xl p-8 text-center">
            <Users className="text-5xl text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">
              No referrals yet. Start inviting friends!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPage;
