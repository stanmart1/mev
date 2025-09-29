import { apiClient } from './api';
import type { APIResponse } from './api';

// Auth Types
export interface User {
  id: string;
  email: string;
  role: 'validator' | 'searcher' | 'researcher' | 'admin';
  walletAddress?: string;
  createdAt: string;
  isActive: boolean;
  subscriptionTier: 'free' | 'developer' | 'professional' | 'enterprise';
  apiUsage: {
    currentMonth: number;
    limit: number;
    resetDate: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'validator' | 'searcher' | 'researcher';
}

export interface WalletLoginData {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  walletAddress?: string;
  preferences: {
    alertThresholds: {
      minProfit: number;
      maxRisk: number;
      notificationChannels: string[];
    };
    favoriteValidators: string[];
    dashboardLayout: string;
    theme: string;
  };
  subscriptionTier: string;
  apiKeys: Array<{
    id: string;
    name: string;
    key: string;
    tier: string;
    createdAt: string;
    lastUsed: string;
  }>;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  tier: string;
  permissions: string[];
  usageLimit: number;
  currentUsage: number;
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetComplete {
  token: string;
  newPassword: string;
}

class AuthAPIService {
  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/login', credentials);
    
    // Set token in API client
    apiClient.setToken(response.data.accessToken);
    
    return response.data;
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/signup', data);
    
    // Set token in API client
    apiClient.setToken(response.data.accessToken);
    
    return response.data;
  }

  async loginWithWallet(data: WalletLoginData): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/wallet-login', data);
    
    // Set token in API client
    apiClient.setToken(response.data.accessToken);
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Don't throw on logout error
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear token
      apiClient.setToken(null);
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/refresh');
    
    // Update token in API client
    apiClient.setToken(response.data.accessToken);
    
    return response.data;
  }

  async verifyToken(): Promise<User> {
    const response = await apiClient.get<APIResponse<User>>('/auth/verify');
    return response.data;
  }

  // Profile Management
  async getUserProfile(): Promise<UserProfile> {
    const response = await apiClient.get<APIResponse<UserProfile>>('/profile');
    return response.data;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put<APIResponse<UserProfile>>('/profile', updates);
    return response.data;
  }

  async updatePreferences(preferences: UserProfile['preferences']): Promise<UserProfile> {
    const response = await apiClient.put<APIResponse<UserProfile>>('/profile/preferences', preferences);
    return response.data;
  }

  // Favorite Validators
  async getFavoriteValidators(): Promise<string[]> {
    const response = await apiClient.get<APIResponse<string[]>>('/profile/favorites');
    return response.data;
  }

  async addFavoriteValidator(address: string): Promise<void> {
    await apiClient.post('/profile/favorites', { address });
  }

  async removeFavoriteValidator(address: string): Promise<void> {
    await apiClient.delete(`/profile/favorites/${address}`);
  }

  // Saved Simulations
  async getSavedSimulations(): Promise<any[]> {
    const response = await apiClient.get<APIResponse<any[]>>('/profile/simulations');
    return response.data;
  }

  async saveSimulation(simulation: any): Promise<any> {
    const response = await apiClient.post<APIResponse<any>>('/profile/simulations', simulation);
    return response.data;
  }

  async updateSimulation(id: string, simulation: any): Promise<any> {
    const response = await apiClient.put<APIResponse<any>>(`/profile/simulations/${id}`, simulation);
    return response.data;
  }

  async deleteSimulation(id: string): Promise<void> {
    await apiClient.delete(`/profile/simulations/${id}`);
  }

  // Alert Settings
  async getAlertSettings(): Promise<any[]> {
    const response = await apiClient.get<APIResponse<any[]>>('/profile/alerts');
    return response.data;
  }

  async setAlertThreshold(type: string, threshold: any): Promise<any> {
    const response = await apiClient.post<APIResponse<any>>(`/profile/alerts/${type}`, threshold);
    return response.data;
  }

  async toggleAlert(id: string): Promise<any> {
    const response = await apiClient.patch<APIResponse<any>>(`/profile/alerts/${id}/toggle`);
    return response.data;
  }

  // API Key Management
  async getAPIKeys(): Promise<APIKey[]> {
    const response = await apiClient.get<APIResponse<APIKey[]>>('/profile/api-keys');
    return response.data;
  }

  async createAPIKey(name: string, tier: string = 'basic'): Promise<APIKey> {
    const response = await apiClient.post<APIResponse<APIKey>>('/profile/api-keys', { name, tier });
    return response.data;
  }

  async revokeAPIKey(keyId: string): Promise<void> {
    await apiClient.delete(`/profile/api-keys/${keyId}`);
  }

  async getAPIKeyUsage(keyId: string): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>(`/profile/api-keys/${keyId}/usage`);
    return response.data;
  }

  // Password Recovery
  async initiatePasswordReset(data: PasswordResetData): Promise<void> {
    await apiClient.post('/profile/password-recovery/initiate', data);
  }

  async validateResetToken(token: string): Promise<boolean> {
    try {
      await apiClient.post('/profile/password-recovery/validate', { token });
      return true;
    } catch {
      return false;
    }
  }

  async completePasswordReset(data: PasswordResetComplete): Promise<void> {
    await apiClient.post('/profile/password-recovery/complete', data);
  }

  // Email Verification
  async initiateEmailVerification(): Promise<void> {
    await apiClient.post('/profile/email-verification/initiate');
  }

  async completeEmailVerification(token: string): Promise<void> {
    await apiClient.post('/profile/email-verification/complete', { token });
  }

  // User Activity
  async getUserActivity(): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>('/profile/activity');
    return response.data;
  }

  // Subscription Management
  async getSubscriptionInfo(): Promise<any> {
    const response = await apiClient.get<APIResponse<any>>('/profile/subscription');
    return response.data;
  }

  async updateSubscription(tier: string): Promise<any> {
    const response = await apiClient.post<APIResponse<any>>('/profile/subscription/upgrade', { tier });
    return response.data;
  }
}

export const authAPI = new AuthAPIService();