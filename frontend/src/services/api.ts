// API service for communicating with the backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RECORDS_BASE_URL = `${BASE_URL}/records`;
const AUTH_BASE_URL = `${BASE_URL}/auth`;
const STAFF_BASE_URL = `${BASE_URL}/staff`;

export interface CarWashRecord {
  id: string;
  registrationNumber: string;
  carModel: string;
  services: string;
  vehicleType?: string;
  serviceOffered?: string;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Mpesa';
  attendant: string;
  date: string;
  time: string;
  mpesaCode?: string;
  createdAt?: any;
  updatedAt?: any;
  status: 'active' | 'completed';
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
    options: RequestInit & { baseURL?: string } = {}
  ): Promise<ApiResponse<T>> {
    const baseURL = options.baseURL || BASE_URL;
    const url = `${baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies in requests
    };

    // Remove baseURL from options before passing to fetch
    const { baseURL: _, ...fetchOptions } = options;

    try {
      const response = await fetch(url, { ...defaultOptions, ...fetchOptions });
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
    
    const endpoint = `${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<CarWashRecord[]>(endpoint, { baseURL: RECORDS_BASE_URL });
  }

  async getRecord(id: string): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>(`/${id}`, { baseURL: RECORDS_BASE_URL });
  }

  async addRecord(record: Omit<CarWashRecord, 'id' | 'time' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>('', {
      method: 'POST',
      body: JSON.stringify(record),
      baseURL: RECORDS_BASE_URL,
    });
  }

  async updateRecord(id: string, record: Partial<CarWashRecord>): Promise<ApiResponse<CarWashRecord>> {
    return this.request<CarWashRecord>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
      baseURL: RECORDS_BASE_URL,
    });
  }

  async deleteRecord(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/${id}`, {
      method: 'DELETE',
      baseURL: RECORDS_BASE_URL,
    });
  }

  async searchRecords(query: string, limit?: number): Promise<ApiResponse<CarWashRecord[]>> {
    const params = new URLSearchParams({ q: query });
    if (limit) params.append('limit', limit.toString());
    
    return this.request<CarWashRecord[]>(`/search?${params.toString()}`, { baseURL: RECORDS_BASE_URL });
  }

  // Dashboard API
  async getDashboardStats(period?: 'all' | 'today' | 'week' | 'month'): Promise<ApiResponse<DashboardStats>> {
    const params = period ? `?period=${period}` : '';
    return this.request<DashboardStats>(`/dashboard${params}`, { baseURL: RECORDS_BASE_URL });
  }

  // Commission API
  async calculateCommission(recordId: string, commissionRate: number = 30): Promise<ApiResponse<any>> {
    return this.request(`/${recordId}/commission`, {
      method: 'POST',
      body: JSON.stringify({ commissionRate }),
      baseURL: RECORDS_BASE_URL,
    });
  }

  async getCommissions(params?: {
    attendant?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.attendant) queryParams.append('attendant', params.attendant);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const endpoint = `/commissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<any[]>(endpoint, { baseURL: RECORDS_BASE_URL });
  }

  async deleteCommission(commissionId: string): Promise<ApiResponse<any>> {
    return this.request(`/commissions/${commissionId}`, {
      method: 'DELETE',
      baseURL: RECORDS_BASE_URL,
    });
  }

  // Auth API
  async login(email: string, password: string): Promise<ApiResponse<{ 
    user: { userId: string; email: string; name: string; role: string } 
  }>> {
    return this.request<{ 
      user: { userId: string; email: string; name: string; role: string } 
    }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      baseURL: AUTH_BASE_URL,
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request('/logout', {
      method: 'POST',
      baseURL: AUTH_BASE_URL,
    });
  }

  async refreshToken(): Promise<ApiResponse<void>> {
    return this.request('/refresh', {
      method: 'POST',
      baseURL: AUTH_BASE_URL,
    });
  }

  async verifyToken(): Promise<ApiResponse<{ user: any }>> {
    return this.request('/verify', {
      baseURL: AUTH_BASE_URL,
    });
  }

  // Settings API
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/settings', { baseURL: AUTH_BASE_URL });
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
      baseURL: AUTH_BASE_URL,
    });
  }

  // Staff Commission API
  async getStaffCommission(date: string): Promise<ApiResponse<StaffCommissionData>> {
    const params = new URLSearchParams({ date });
    return this.request<StaffCommissionData>(`/commission?${params.toString()}`, { baseURL: STAFF_BASE_URL });
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
    
    const endpoint = `/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request<StaffSummaryData>(endpoint, { baseURL: STAFF_BASE_URL });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ timestamp: string }>> {
    return this.request('/health', { baseURL: AUTH_BASE_URL });
  }
}

export const apiService = new ApiService();
export default apiService;
