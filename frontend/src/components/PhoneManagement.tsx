import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Lock, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const PhoneManagement: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [currentPhone, setCurrentPhone] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const [formData, setFormData] = useState({
    newPhone: '',
    verificationCode: '',
    currentPassword: ''
  });

  const [errors, setErrors] = useState<{
    newPhone?: string;
    verificationCode?: string;
    currentPassword?: string;
  }>({});

  useEffect(() => {
    fetchCurrentPhone();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchCurrentPhone = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentPhone(response.data.phone);
      setIsPhoneVerified(response.data.phone_verified);
    } catch (error) {
      console.error('Failed to fetch phone:', error);
      toast.error('Failed to load phone number');
    }
  };

  const formatPhoneDisplay = (phone: string): string => {
    // Format phone number for display (e.g., +1 (555) 123-4567)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleSendCode = async () => {
    if (!formData.newPhone) {
      setErrors({ ...errors, newPhone: 'Please enter a new phone number' });
      return;
    }

    setSendingCode(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/send-verification-code`, {
        phone: formData.newPhone,
        purpose: 'register'
      });

      toast.success('Verification code sent!');
      setCountdown(60);
    } catch (error: any) {
      console.error('Failed to send code:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send verification code';
      toast.error(errorMessage);
    } finally {
      setSendingCode(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.newPhone) {
      newErrors.newPhone = 'New phone number is required';
    } else if (!/^\d{10,11}$/.test(formData.newPhone.replace(/\D/g, ''))) {
      newErrors.newPhone = 'Please enter a valid phone number';
    }

    if (!formData.verificationCode) {
      newErrors.verificationCode = 'Verification code is required';
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = 'Verification code must be 6 digits';
    }

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/users/phone`,
        {
          new_phone: formData.newPhone,
          verification_code: formData.verificationCode,
          current_password: formData.currentPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Phone number updated successfully!');
      navigate('/profile');
    } catch (error: any) {
      console.error('Failed to update phone:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update phone number';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Phone Number</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Current Phone Display */}
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Current Phone Number</p>
              <p className="text-lg font-medium">{formatPhoneDisplay(currentPhone)}</p>
            </div>
            {isPhoneVerified && (
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <CheckCircle className="w-4 h-4" />
                Verified
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>You'll need to verify your new phone number</li>
                <li>Your current password is required for security</li>
                <li>This will update your login credentials</li>
              </ul>
            </div>
          </div>

          {/* New Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              New Phone Number
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={formData.newPhone}
                    onChange={handleInputChange('newPhone')}
                    placeholder="Enter new phone number"
                    className="flex-1 bg-transparent outline-none"
                  />
                </div>
                {errors.newPhone && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.newPhone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className="px-4 py-3 bg-[#D4AF37] text-black font-medium rounded-lg hover:bg-[#B8941F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {sendingCode ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  'Send Code'
                )}
              </button>
            </div>
          </div>

          {/* Verification Code */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Verification Code
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <input
                type="text"
                value={formData.verificationCode}
                onChange={handleInputChange('verificationCode')}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.verificationCode && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.verificationCode}
              </p>
            )}
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Current Password
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <Lock className="w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={formData.currentPassword}
                onChange={handleInputChange('currentPassword')}
                placeholder="Enter current password"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-semibold py-3 rounded-lg hover:bg-[#B8941F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Phone Number'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PhoneManagement;
