import apiClient from '../lib/api';

export interface UpdateProfileRequest {
  full_name?: string;
  avatar_url?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string; // YYYY-MM-DD format
}

export interface UpdateProfileResponse {
  message: string;
  user: {
    id: number;
    phone: string;
    email?: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    gender?: 'male' | 'female' | 'other';
    birthday?: string;
    phone_verified: boolean;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
    updated_at?: string;
  };
}

export interface BindPhoneRequest {
  phone: string;
  verification_code: string;
}

export interface BindPhoneResponse {
  message: string;
}

export interface UpdatePhoneRequest {
  new_phone: string;
  verification_code: string;
  current_password: string;
}

export interface UpdatePhoneResponse {
  message: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdatePasswordResponse {
  message: string;
}

export interface UpdateSettingsRequest {
  notification_enabled?: boolean;
  language?: 'en' | 'zh';
}

export interface UpdateSettingsResponse {
  message: string;
  settings: {
    notification_enabled: boolean;
    language: string;
  };
}

class UsersService {
  /**
   * 更新个人资料
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const response = await apiClient.put('/users/profile', data);
    
    // 更新本地存储的用户信息
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const updatedUser = { ...user, ...response.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Failed to update local user:', error);
      }
    }
    
    return response.data;
  }

  /**
   * 绑定手机号
   */
  async bindPhone(data: BindPhoneRequest): Promise<BindPhoneResponse> {
    const response = await apiClient.post('/users/phone', data);
    return response.data;
  }

  /**
   * 修改手机号
   */
  async updatePhone(data: UpdatePhoneRequest): Promise<UpdatePhoneResponse> {
    const response = await apiClient.put('/users/phone', data);
    return response.data;
  }

  /**
   * 修改密码
   */
  async updatePassword(data: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
    const response = await apiClient.put('/users/password', data);
    return response.data;
  }

  /**
   * 更新用户设置
   */
  async updateSettings(data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
    const response = await apiClient.put('/users/settings', data);
    return response.data;
  }
}

export default new UsersService();
