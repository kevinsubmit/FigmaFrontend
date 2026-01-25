import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, User, Mail, Phone, Calendar, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

interface UserProfile {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    gender: '',
    date_of_birth: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        gender: response.data.gender || '',
        date_of_birth: response.data.date_of_birth || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/auth/me/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setProfile(prev => prev ? { ...prev, avatar_url: response.data.avatar_url } : null);
      await refreshUser();
      toast.success('Avatar updated successfully!', { autoClose: 1200 });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      // Prepare update data (only include non-empty fields)
      const updateData: any = {};
      if (formData.full_name) updateData.full_name = formData.full_name;
      if (formData.email) updateData.email = formData.email;
      if (!isGenderSet && formData.gender) updateData.gender = formData.gender;
      if (!isDateOfBirthSet && formData.date_of_birth) updateData.birthday = formData.date_of_birth;

      await axios.put(`${API_BASE_URL}/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await refreshUser();
      toast.success('Profile updated successfully!', { autoClose: 1200 });
      navigate('/profile');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isGenderSet = profile.gender !== null && profile.gender !== '';
  const isDateOfBirthSet = profile.date_of_birth !== null && profile.date_of_birth !== '';

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold">Edit Profile</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${profile.avatar_url}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-600" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-[#D4AF37] p-2 rounded-full cursor-pointer hover:bg-[#B8941F] transition-colors"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-black" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-gray-400">Click camera icon to change avatar</p>
          </div>

          {/* Username (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Username
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800">
              <User className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={profile.username}
                disabled
                className="flex-1 bg-transparent text-gray-500 outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Full Name
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <User className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <Mail className="w-5 h-5 text-gray-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Phone (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Phone Number
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-800">
              <Phone className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={profile.phone}
                disabled
                className="flex-1 bg-transparent text-gray-500 outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Contact support to change phone number</p>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Gender
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <Users className="w-5 h-5 text-gray-500" />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                disabled={isGenderSet}
                className={`flex-1 bg-transparent outline-none ${isGenderSet ? 'text-gray-500' : ''}`}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            {isGenderSet && (
              <p className="text-xs text-gray-500 mt-1">Gender cannot be changed once set</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Date of Birth
            </label>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-lg border border-gray-700 focus-within:border-[#D4AF37]">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                disabled={isDateOfBirthSet}
                className={`flex-1 bg-transparent outline-none ${isDateOfBirthSet ? 'text-gray-500' : ''}`}
              />
            </div>
            {isDateOfBirthSet && (
              <p className="text-xs text-gray-500 mt-1">Date of birth cannot be changed once set</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-semibold py-3 rounded-lg hover:bg-[#B8941F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export { EditProfile };
export default EditProfile;
