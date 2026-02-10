import { useMemo, useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';
import { getAuthErrorMessage } from '../utils/authMessages';

interface LoginProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

export function Login({ onNavigate, onBack }: LoginProps) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useVerificationCode, setUseVerificationCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (value: string) => value.replace(/\D/g, '');
  const isValidUSPhone = (value: string) => {
    const digits = normalizePhone(value);
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  };

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

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
        purpose: 'login',
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

  // 密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formPhone = new FormData(form).get('phone')?.toString() || '';
    const resolvedPhone = phone || formPhone;

    if (!resolvedPhone || !password) {
      setError('Please enter both phone number and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const loginPhone = normalizePhone(resolvedPhone);
      await login({ phone: loginPhone, password });
      
      // 登录成功后统一跳转到首页，避免回到注册页
      onNavigate('home');
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 验证码登录
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.currentTarget as HTMLFormElement;
    const formPhone = new FormData(form).get('phone')?.toString() || '';
    const resolvedPhone = phone || formPhone;

    if (!resolvedPhone || !verificationCode) {
      setError('Please enter both phone number and verification code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 先验证验证码
      const result = await authService.verifyCode({
        phone: normalizePhone(resolvedPhone),
        code: verificationCode,
        purpose: 'login',
      });

      if (!result.valid) {
        setError('The verification code is invalid or expired. Please request a new code.');
        return;
      }

      // 验证码有效，使用临时密码登录（需要后端支持）
      // TODO: 后端需要支持验证码登录
      setError('SMS login is not available yet. Please use password login.');
      
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
          onClick={() => onBack ? onBack() : onNavigate('home')}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold pr-10">Log In</h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8 max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#B08D2D] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-black/30">
            <span className="text-3xl">💅</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-400 mt-2">Log in to book and manage appointments</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1 mb-6 border border-white/10">
          <button
            onClick={() => setUseVerificationCode(false)}
            className={`flex-1 py-2 rounded-md transition-all ${
              !useVerificationCode
                ? 'bg-[#D4AF37] text-black shadow-sm font-medium'
                : 'text-gray-300'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setUseVerificationCode(true)}
            className={`flex-1 py-2 rounded-md transition-all ${
              useVerificationCode
                ? 'bg-[#D4AF37] text-black shadow-sm font-medium'
                : 'text-gray-300'
            }`}
          >
            SMS Code
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={useVerificationCode ? handleCodeLogin : handlePasswordLogin}>
          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              US Phone Number
            </label>
              <input
                type="tel"
                value={phone}
                name="phone"
                onChange={(e) => setPhone(e.target.value)}
                onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
                placeholder="e.g. 4151234567"
                inputMode="tel"
                autoComplete="tel"
              className="w-full px-4 py-3 border border-white/10 rounded-lg bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
              maxLength={20}
            />
            <p className="mt-2 text-xs text-gray-500">US numbers only (10 digits or 1+10)</p>
          </div>

          {/* Password or Verification Code */}
          {!useVerificationCode ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
          ) : (
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
              <p className="mt-2 text-xs text-gray-500">SMS login will be available soon</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#D4AF37] text-black rounded-lg font-semibold hover:bg-[#b08d2d] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4" />
          We only use your phone for bookings and notifications
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-gray-400">
            New here?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-[#D4AF37] font-medium hover:text-[#e2c15a]"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
