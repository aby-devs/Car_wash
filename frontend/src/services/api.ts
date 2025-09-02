// API service for communicating with the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface CarWashRecord {
  id: string;
  registrationNumber: string;
  carModel: string;
  services: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;
  date: string;
  time: string;
  status?: 'Completed' | 'Pending' | 'In Progress';
  mpesaCode?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  count?: number;
  error?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalServices: number;
  uniqueAttendants: number;
  averageService: number;
  paymentBreakdown: {
    mpesa: {
      count: number;
      revenue: number;
    };
    cash: {
      count: number;
      revenue: number;
    };
  };
  staffPerformance: Array<{
    attendant: string;
    services: number;
    revenue: number;
    averageService: number;
  }>;
  recentRecords: CarWashRecord[];
}

export interface StaffCommissionData {
  date: string;
  totalStaff: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  commissionRate: number;
  staffBreakdown: Array<{
    attendant: string;
    services: number;
    revenue: number;
    commission: number;
    averageService: number;
  }>;
}

export interface StaffSummaryData {
  period: string;
  dateRange?: { startDate: string; endDate: string };
  totalStaff: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  commissionRate: number;
  topPerformers: Array<{
    attendant: string;
    services: number;
    revenue: number;
    commission: number;
    averageService: number;
  }>;
  staffPerformance: Array<{
    attendant: string;
    services: number;
    revenue: number;
    commission: number;
    averageService: number;
  }>;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Records API
  async getRecords(params?: {
    status?: string;
    paymentMethod?: string;
    attendant?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<CarWashRecord[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/records${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<CarWashRecord[]>(endpoint);
  }

  async getRecord(id: string): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>(`/records/${id}`);
  }

  async addRecord(record: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async updateRecord(id: string, record: Partial<CarWashRecord>): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>(`/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  }

  async deleteRecord(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/records/${id}`, {
      method: 'DELETE',
    });
  }

  async searchRecords(query: string, limit?: number): Promise<ApiResponse<CarWashRecord[]>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    
    return this.request<CarWashRecord[]>(`/records/search?${params.toString()}`);
  }

  // Dashboard API
  async getDashboardStats(period?: 'all' | 'today' | 'week' | 'month'): Promise<ApiResponse<DashboardStats>> {
    const params = period ? `?period=${period}` : '';
    return this.request<DashboardStats>(`/records/dashboard${params}`);
  }

  // Auth API
  async login(username: string, password: string): Promise<ApiResponse<{ sessionId: string; username: string; loginTime: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(sessionId: string): Promise<ApiResponse<void>> {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  async verifySession(sessionId: string): Promise<ApiResponse<{ sessionId: string; username: string; loginTime: any }>> {
    return this.request(`/auth/verify?sessionId=${sessionId}`);
  }

  // Settings API
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/settings');
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Staff Commission API
  async getStaffCommission(date: string): Promise<ApiResponse<StaffCommissionData>> {
    const params = new URLSearchParams({ date });
    return this.request<StaffCommissionData>(`/staff/commission?${params.toString()}`);
  }

  async getStaffSummary(params?: {
    startDate?: string;
    endDate?: string;
    period?: 'all' | 'today' | 'week' | 'month';
  }): Promise<ApiResponse<StaffSummaryData>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/staff/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<StaffSummaryData>(endpoint);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ timestamp: string }>> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
export default apiService;
