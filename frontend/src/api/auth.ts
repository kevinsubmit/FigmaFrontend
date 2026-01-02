/**
 * Authentication API Service
 */

import apiClient from './client';

export interface RegisterData {
  phone: string;  // Required: US phone number (10 or 11 digits)
  verification_code: string;  // Required: 6-digit verification code
  username: string;
  password: string;
  email?: string;  // Optional
  full_name?: string;
}

export interface LoginData {
  phone: string;  // Can use phone or email
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
  created_at: string;
  updated_at: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<User> {
  return apiClient.post<User>('/api/v1/auth/register', data);
}

/**
 * Login user
 */
export async function login(data: LoginData): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/api/v1/auth/login', data);
  
  // Store tokens
  apiClient.setToken(response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  
  return response;
}

/**
 * Logout user
 */
export function logout(): void {
  apiClient.removeToken();
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>('/api/v1/auth/me', true);
}

/**
 * Refresh access token
 */
export async function refreshToken(): Promise<TokenResponse> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<TokenResponse>('/api/v1/auth/refresh', {
    refresh_token: refreshToken,
  });

  // Update tokens
  apiClient.setToken(response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);

  return response;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return localStorage.getItem('access_token') !== null;
}

/**
 * Send verification code to phone
 */
export async function sendVerificationCode(phone: string, purpose: 'register' | 'login' | 'reset_password' = 'register'): Promise<{ message: string; expires_in: number }> {
  return apiClient.post<{ message: string; expires_in: number }>('/api/v1/auth/send-verification-code', {
    phone,
    purpose,
  });
}

/**
 * Verify verification code
 */
export async function verifyCode(phone: string, code: string, purpose: 'register' | 'login' | 'reset_password' = 'register'): Promise<{ valid: boolean; message: string }> {
  return apiClient.post<{ valid: boolean; message: string }>('/api/v1/auth/verify-code', {
    phone,
    code,
    purpose,
  });
}
