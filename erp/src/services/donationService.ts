import { donations } from '@/lib/api';
import { ApiResponse, PaginatedResponse } from '@/lib/api';

export interface Donation {
  id: string;
  donorId?: string | null;
  donor?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    type: string;
    category: string;
  } | null;
  amount: number;
  date: string;
  purpose: 'project' | 'scheme';
  purposeId: string;
  purposeName?: string;
  method: 'cash' | 'cheque' | 'online' | 'bank_transfer' | 'upi';
  mode: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  receiptNumber?: string;
  notes?: string;
  /** Donor PAN, collected for online gifts above ₹50,000. */
  panNumber?: string | null;
  isAnonymous: boolean;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface DonationFilters {
  search?: string;
  donorId?: string;
  purpose?: string;
  method?: string;
  mode?: string;
  status?: string;
  isAnonymous?: boolean;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class DonationService {
  // Donation CRUD Operations
  async getAll(filters?: DonationFilters): Promise<PaginatedResponse<Donation>> {
    const response = await donations.getHistory(filters);
    return response.data || response;
  }

  async getById(id: string): Promise<ApiResponse<Donation>> {
    const response = await donations.getById(id);
    return response.data;
  }

  async create(data: {
    donorId: string | null;
    amount: number;
    date: string;
    purpose: 'project' | 'scheme';
    purposeId: string;
    method: string;
    mode: string;
    receiptNumber?: string;
    notes?: string;
    isAnonymous: boolean;
  }): Promise<ApiResponse<Donation>> {
    const response = await donations.create(data);
    return response.data;
  }

  async update(id: string, data: Partial<Donation>): Promise<ApiResponse<Donation>> {
    const response = await donations.update(id, data);
    return response.data;
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await donations.delete(id);
    return response.data;
  }

  // Statistics and Analytics
  async getStats(): Promise<ApiResponse<{
    overview: {
      totalDonations: number;
      totalAmount: number;
      averageDonation: number;
      anonymousDonations: number;
      completedDonations: number;
      pendingDonations: number;
    };
    byMethod: Array<{
      method: string;
      count: number;
      totalAmount: number;
      percentage: number;
    }>;
    byPurpose: Array<{
      purpose: string;
      count: number;
      totalAmount: number;
      percentage: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      donationCount: number;
      totalAmount: number;
      averageAmount: number;
    }>;
  }>> {
    const response = await donations.getStats();
    return response.data;
  }

  async getRecent(limit: number = 20): Promise<ApiResponse<{
    donations: Donation[];
    summary: any;
  }>> {
    const response = await donations.getRecent(limit);
    return response.data;
  }

  async getHistory(filters?: DonationFilters): Promise<PaginatedResponse<Donation>> {
    const response = await donations.getHistory(filters);
    return response.data || response;
  }

  async getByDonor(donorId: string, filters?: DonationFilters): Promise<PaginatedResponse<Donation>> {
    const response = await donations.getByDonor(donorId, filters);
    return response.data || response;
  }
}

export const donationService = new DonationService();