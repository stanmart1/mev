// Base API client with error handling and authentication
class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('mev-token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('mev-token', token);
    } else {
      localStorage.removeItem('mev-token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('mev-token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it
          this.setToken(null);
          window.location.href = '/login';
          throw new Error('Authentication required');
        }

        const errorData = await response.json().catch(() => ({
          error: 'Request failed',
          message: `HTTP ${response.status}`,
        }));

        throw new APIError(
          errorData.error || 'Request failed',
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      console.error('API Request failed:', error);
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0,
        { originalError: error }
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(endpoint + url.search.replace(url.origin + url.pathname, ''));
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export class APIError extends Error {
  status: number;
  data?: any;

  constructor(
    message: string,
    status: number,
    data?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Response wrapper types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    timestamp: string;
    request_id: string;
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
    };
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  metadata: {
    timestamp: string;
    request_id: string;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasNext: boolean;
    };
  };
}

// Common API parameters
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  status?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type QueryParams = PaginationParams & FilterParams & SortParams;