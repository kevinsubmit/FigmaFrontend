import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';

interface LoginProps {
  onNavigate: (page: string) => void;
  onBack?: () => void;
}

export function Login({ onNavigate, onBack }: LoginProps) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [useVerificationCode, setUseVerificationCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setError('请输入手机号');
      return;
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await authService.sendVerificationCode({
        phone,
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
      setError(err.response?.data?.detail || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  // 密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !password) {
      setError('请输入手机号和密码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await login({ phone, password });
      
      // 登录成功，返回上一页或跳转到首页
      if (onBack) {
        onBack();
      } else {
        onNavigate('home');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证码登录
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !verificationCode) {
      setError('请输入手机号和验证码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 先验证验证码
      const result = await authService.verifyCode({
        phone,
        code: verificationCode,
        purpose: 'login',
      });

      if (!result.valid) {
        setError('验证码无效或已过期');
        return;
      }

      // 验证码有效，使用临时密码登录（需要后端支持）
      // TODO: 后端需要支持验证码登录
      setError('验证码登录功能开发中，请使用密码登录');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button
          onClick={() => onBack ? onBack() : onNavigate('home')}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold pr-10">登录</h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">💅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">欢迎回来</h2>
          <p className="text-gray-500 mt-2">登录您的账户继续使用</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setUseVerificationCode(false)}
            className={`flex-1 py-2 rounded-md transition-all ${
              !useVerificationCode
                ? 'bg-white text-pink-600 shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            密码登录
          </button>
          <button
            onClick={() => setUseVerificationCode(true)}
            className={`flex-1 py-2 rounded-md transition-all ${
              useVerificationCode
                ? 'bg-white text-pink-600 shadow-sm font-medium'
                : 'text-gray-600'
            }`}
          >
            验证码登录
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={useVerificationCode ? handleCodeLogin : handlePasswordLogin}>
          {/* Phone Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              maxLength={11}
            />
          </div>

          {/* Password or Verification Code */}
          {!useVerificationCode ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                验证码
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="请输入验证码"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || loading}
                  className="px-4 py-3 bg-pink-500 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            还没有账户？{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-pink-600 font-medium hover:text-pink-700"
            >
              立即注册
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
