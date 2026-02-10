import React, { useMemo, useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import authService from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/authMessages';

interface RegisterProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

export function Register({ onNavigate, onBack }: RegisterProps) {
  const { register } = useAuth();
  const [step, setStep] = useState(1); // 1: 手机号验证, 2: 填写信息
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  const normalizePhone = (value: string) => value.replace(/\D/g, '');
  const isValidUSPhone = (value: string) => {
    const digits = normalizePhone(value);
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  };
  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  
  // 从 URL 参数获取推荐码
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setError('Enter your US phone number');
      return;
    }

    if (!isValidUSPhone(phone)) {
      setError('Enter a valid US phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await authService.sendVerificationCode({
        phone: normalizedPhone,
        purpose: 'register',
      });

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setError('');
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 验证手机号和验证码
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !verificationCode) {
      setError('Please enter both phone number and verification code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await authService.verifyCode({
        phone: normalizedPhone,
        code: verificationCode,
        purpose: 'register',
      });

      if (result.valid) {
        setStep(2);
        setError('');
      } else {
        setError('The verification code is invalid or expired. Please request a new code.');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await register({
        phone: normalizedPhone,
        verification_code: verificationCode,
        username,
        password,
        full_name: fullName || undefined,
        referral_code: referralCode || undefined,
      });

      // 注册成功，跳转到首页
      if (onBack) {
        onBack();
      } else {
        onNavigate('home');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(120%_120%_at_50%_0%,_#3a2a12_0%,_#0b0b0b_45%,_#0b0b0b_100%)]">
      {/* Header */}
      <div className="bg-black/80 border-b border-white/10 px-4 py-3 flex items-center">
        <button
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else {
              onBack ? onBack() : onNavigate('home');
            }
          }}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold pr-10">Sign Up</h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8 max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#B08D2D] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-black/30">
            <span className="text-3xl">💅</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
          <p className="text-gray-400 mt-2">
            {step === 1 ? 'Verify your phone number' : 'Complete your profile'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-gray-400'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#D4AF37]' : 'bg-white/10'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-[#D4AF37] text-black' : 'bg-white/10 text-gray-400'
          }`}>
            2
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone Verification */}
        {step === 1 && (
          <form onSubmit={handleVerifyPhone}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                US Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 4151234567"
                inputMode="tel"
                autoComplete="tel"
                className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                maxLength={20}
              />
              <p className="mt-2 text-xs text-gray-500">US numbers only (10 digits or 1+10)</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Verification Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="flex-1 px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="px-4 py-3 bg-[#D4AF37] text-black rounded-lg font-medium disabled:bg-white/20 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[#b08d2d] transition-colors whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : 'Send Code'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D4AF37] text-black rounded-lg font-semibold hover:bg-[#b08d2d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Next'}
            </button>
          </form>
        )}

        {/* Step 2: User Information */}
        {step === 2 && (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="At least 3 characters"
                className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-500">Shown on reviews and your profile</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referral Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Enter code to get $10 off"
                className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent uppercase"
                maxLength={10}
              />
              {referralCode && (
                <p className="mt-1 text-sm text-green-400">
                  ✓ You and your friend get a $10 coupon
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#D4AF37] text-black rounded-lg font-semibold hover:bg-[#b08d2d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4" />
          We only use your phone for bookings and notifications
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-[#D4AF37] font-medium hover:text-[#e2c15a]"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
