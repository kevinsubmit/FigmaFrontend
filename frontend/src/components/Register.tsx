import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import authService from '../services/auth.service';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  
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
      setError(err.response?.data?.detail || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证手机号和验证码
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !verificationCode) {
      setError('请输入手机号和验证码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await authService.verifyCode({
        phone,
        code: verificationCode,
        purpose: 'register',
      });

      if (result.valid) {
        setStep(2);
        setError('');
      } else {
        setError('验证码无效或已过期');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '验证失败');
    } finally {
      setLoading(false);
    }
  };

  // 完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!username || !password || !confirmPassword) {
      setError('请填写所有必填项');
      return;
    }

    if (username.length < 3) {
      setError('用户名至少3个字符');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6个字符');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await register({
        phone,
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
      setError(err.response?.data?.detail || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button
          onClick={() => {
            if (step === 2) {
              setStep(1);
            } else {
              onBack ? onBack() : onNavigate('home');
            }
          }}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold pr-10">注册</h1>
      </div>

      {/* Content */}
      <div className="px-6 pt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">💅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">创建账户</h2>
          <p className="text-gray-500 mt-2">
            {step === 1 ? '验证您的手机号' : '完善您的信息'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-pink-500' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone Verification */}
        {step === 1 && (
          <form onSubmit={handleVerifyPhone}>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '验证中...' : '下一步'}
            </button>
          </form>
        )}

        {/* Step 2: User Information */}
        {step === 2 && (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名（至少3个字符）"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="请输入您的真实姓名（选填）"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6个字符）"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                推荐码 <span className="text-gray-400">(可选)</span>
              </label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="输入推荐码获得$10优惠券"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase"
                maxLength={10}
              />
              {referralCode && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ 注册成功后您和推荐人都将获得$10优惠券
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '完成注册'}
            </button>
          </form>
        )}

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            已有账户？{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-pink-600 font-medium hover:text-pink-700"
            >
              立即登录
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
