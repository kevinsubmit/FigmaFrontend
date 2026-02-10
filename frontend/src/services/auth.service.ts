import apiClient from '../lib/api';

export interface SendVerificationCodeRequest {
  phone: string;
  purpose: 'register' | 'login' | 'reset_password';
}

export interface SendVerificationCodeResponse {
  message: string;
  expires_in: number;
}

export interface VerifyCodeRequest {
  phone: string;
  code: string;
  purpose: 'register' | 'login' | 'reset_password';
}

export interface VerifyCodeResponse {
  valid: boolean;
  message: string;
}

export interface RegisterRequest {
  phone: string;
  verification_code: string;
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  phone_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  store_id?: number | null;
  created_at: string;
  updated_at?: string;
}

class AuthService {
  /**
   * 发送验证码
   */
  async sendVerificationCode(data: SendVerificationCodeRequest): Promise<SendVerificationCodeResponse> {
    const response = await apiClient.post('/auth/send-verification-code', data);
    return response.data;
  }

  /**
   * 验证验证码
   */
  async verifyCode(data: VerifyCodeRequest): Promise<VerifyCodeResponse> {
    const response = await apiClient.post('/auth/verify-code', data);
    return response.data;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<User> {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  }

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post('/auth/login', {
      ...data,
      login_portal: 'frontend',
    });
    const { access_token, refresh_token, token_type } = response.data;
    
    // 保存Token到localStorage
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    
    return response.data;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/auth/me');
    const user = response.data;
    
    // 保存用户信息到localStorage
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  }

  /**
   * 退出登录
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * 获取本地存储的用户信息
   */
  getLocalUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default new AuthService();
