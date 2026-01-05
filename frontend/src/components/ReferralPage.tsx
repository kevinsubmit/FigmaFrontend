import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCopy, FiShare2, FiGift, FiUsers, FiCheck } from 'react-icons/fi';
import referralService, { ReferralStats, ReferralListItem } from '../services/referral.service';

const ReferralPage: React.FC = () => {
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralList, setReferralList] = useState<ReferralListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        copyShareLink(shareUrl);
      }
    } else {
      copyShareLink(shareUrl);
    }
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
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
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <FiCheck /> Rewarded
        </span>
      );
    }
    return (
      <span className="text-yellow-600 text-sm">
        ⏳ Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <button
          onClick={() => navigate('/profile')}
          className="mb-4 text-white/80 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FiGift className="text-3xl" />
          Invite Friends
        </h1>
        <p className="text-white/90 mt-2">
          Share the love and earn rewards together!
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Referral Code Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Your Referral Code
          </h2>
          
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-purple-700 tracking-wider mb-4">
              {referralCode}
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={copyReferralCode}
                className="flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors shadow-sm"
              >
                {copied ? <FiCheck /> : <FiCopy />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              
              <button
                onClick={shareReferral}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm"
              >
                <FiShare2 />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-lg p-6 border-2 border-amber-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiGift className="text-amber-600" />
            Rewards
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-800">You get: $10 coupon</p>
                <p className="text-sm text-gray-600">When your friend registers</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-gray-800">Friend gets: $10 coupon</p>
                <p className="text-sm text-gray-600">Upon successful registration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiUsers />
              Your Stats
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.total_referrals}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Friends Invited
                </div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.total_rewards_earned}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Coupons Earned
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.successful_referrals}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Successful
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pending_referrals}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Pending
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Referral History */}
        {referralList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Referral History
            </h2>
            
            <div className="space-y-3">
              {referralList.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {item.referee_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.referee_phone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined: {formatDate(item.created_at)}
                    </p>
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
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <FiUsers className="text-6xl text-gray-300 mx-auto mb-4" />
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
