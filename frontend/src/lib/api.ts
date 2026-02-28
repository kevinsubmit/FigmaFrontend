import axios from 'axios';
import { forceRelogin, shouldForceRelogin } from '../utils/authGuard';
import { getApiErrorMessage } from '../utils/apiErrorMessages';
import {
  hasMeaningfulValue,
  isBodyMethod,
  shouldAllowEmptyBody,
  validateRequestPayload,
} from './requestValidation';

// API Base URL - 根据环境变量配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 创建axios实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'GET').toUpperCase();
    if (isBodyMethod(method)) {
      const allowEmptyByRoute = shouldAllowEmptyBody(method, config.url);
      const allowEmptyBody = allowEmptyByRoute
        || ((config.data === undefined || config.data === null) && hasMeaningfulValue(config.params));
      validateRequestPayload(config.data, {
        context: `${method} ${config.url || ''}`.trim(),
        allowEmptyBody,
        method,
        path: config.url,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理Token过期
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail ?? error?.response?.data;

    if (shouldForceRelogin(status, detail)) {
      forceRelogin();
      return Promise.reject(error);
    }

    const userMessage = getApiErrorMessage(error);
    if (error?.response?.data && typeof error.response.data === 'object') {
      error.response.data = {
        ...error.response.data,
        detail: userMessage,
      };
    }
    error.message = userMessage;

    return Promise.reject(error);
  }
);

export default apiClient;
