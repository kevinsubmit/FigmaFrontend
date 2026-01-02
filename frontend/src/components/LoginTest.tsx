/**
 * Login Test Component
 * Simple component to test authentication with backend
 */

import { useState } from 'react';
import { login, register, getCurrentUser, logout, sendVerificationCode, type User } from '../api/auth';
import { toast } from 'sonner';

interface LoginTestProps {
  onLoginSuccess?: () => void;
}

export function LoginTest({ onLoginSuccess }: LoginTestProps = {}) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Countdown timer for verification code
  const startCountdown = () => {
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
  };

  const handleSendCode = async () => {
    if (!phone) {
      toast.error('Please enter phone number');
      return;
    }

    // Validate phone format (10 or 11 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
      toast.error('Please enter a valid US phone number (10 or 11 digits)');
      return;
    }

    setSendingCode(true);
    try {
      const response = await sendVerificationCode(phone, 'register');
      toast.success(response.message || 'Verification code sent!');
      startCountdown();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login({ phone, password });
      toast.success('Login successful!');
      
      // Fetch user info
      const userInfo = await getCurrentUser();
      setUser(userInfo);
      
      // Call onLoginSuccess callback to navigate to home
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess();
        }, 500); // Small delay to show success message
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);

    try {
      await register({
        phone,
        verification_code: verificationCode,
        username,
        password,
        email: email || undefined,
        full_name: fullName || undefined,
      });
      toast.success('Registration successful! Please login.');
      setMode('login');
      // Clear form
      setVerificationCode('');
      setUsername('');
      setFullName('');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const handleGetCurrentUser = async () => {
    setLoading(true);
    try {
      const userInfo = await getCurrentUser();
      setUser(userInfo);
      toast.success('User info loaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get user info');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Backend Integration Test
        </h1>

        {user ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">User Info</h2>
            <div className="space-y-2">
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Phone:</strong> {user.phone}</p>
              <p><strong>Email:</strong> {user.email || 'N/A'}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Full Name:</strong> {user.full_name || 'N/A'}</p>
              <p><strong>Phone Verified:</strong> {user.phone_verified ? 'Yes' : 'No'}</p>
              <p><strong>Active:</strong> {user.is_active ? 'Yes' : 'No'}</p>
              <p><strong>Admin:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
            </div>
            <div className="mt-6 space-y-2">
              <button
                onClick={handleGetCurrentUser}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh User Info'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setMode('login')}
                className={`px-4 py-2 rounded-l-lg ${
                  mode === 'login'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`px-4 py-2 rounded-r-lg ${
                  mode === 'register'
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="3158008606 or 13158008606"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">US phone number (10 or 11 digits)</p>
                </div>

                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          required
                          maxLength={6}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={sendingCode || countdown > 0}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {sendingCode
                            ? 'Sending...'
                            : countdown > 0
                            ? `${countdown}s`
                            : 'Send Code'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Click "Send Code" to receive verification code
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-pink-500 text-white py-2 px-4 rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Backend API: http://localhost:8000</p>
          <p className="mt-2">
            <a
              href="http://localhost:8000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-500 hover:underline"
            >
              View API Documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
