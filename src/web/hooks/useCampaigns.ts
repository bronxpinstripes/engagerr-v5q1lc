import { useState, useCallback, useMemo } from 'react'; // version: ^18.0.0
import { useQuery, useMutation, useQueryClient } from 'react-query'; // version: ^5.0.0
import { useAuth } from './useAuth';
import { useBrand } from './useBrand';
import { useToast } from './useToast';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../lib/constants';
import { 
  Campaign, 
  CampaignStatus, 
  CampaignDetail, 
  CampaignParticipant, 
  ParticipantStatus, 
  CampaignMetrics, 
  CreateCampaignRequest, 
  UpdateCampaignRequest, 
  AddParticipantRequest,
  CampaignFilters,
  CampaignListResponse,
  CampaignDashboardData
} from '../types/campaign';
import { UserType } from '../types/user';

/**
 * Interface defining the return value of the useCampaigns hook
 */
export interface CampaignsHookReturn {
  // Campaign state
  campaigns: Campaign[] | undefined;
  totalCount: number | undefined;
  currentPage: number;
  pageSize: number;
  hasMorePages: boolean;
  isLoading: boolean;
  error: string | null;

  // Dashboard data
  dashboardData: CampaignDashboardData | undefined;
  dashboardLoading: boolean;

  // Campaign detail data
  campaignDetail: CampaignDetail | undefined;
  campaignDetailLoading: boolean;
  campaignDetailError: string | null;

  // Campaign analytics data
  campaignAnalytics: CampaignMetrics | undefined;
  campaignAnalyticsLoading: boolean;

  // Data fetching functions
  getCampaigns: (filters?: CampaignFilters, page?: number, pageSize?: number) => Promise<CampaignListResponse>;
  getCampaignDashboardData: () => Promise<CampaignDashboardData>;
  getCampaignById: (campaignId: string) => Promise<CampaignDetail>;
  getCampaignAnalytics: (campaignId: string) => Promise<CampaignMetrics>;

  // Data mutation functions
  createCampaign: (campaignData: CreateCampaignRequest) => Promise<Campaign>;
  updateCampaign: (campaignId: string, campaignData: UpdateCampaignRequest) => Promise<Campaign>;
  changeCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<Campaign>;
  addCreatorToCampaign: (participantData: AddParticipantRequest) => Promise<CampaignParticipant>;
  removeCreatorFromCampaign: (campaignId: string, participantId: string) => Promise<void>;
  updateParticipantStatus: (participantId: string, status: ParticipantStatus) => Promise<CampaignParticipant>;

  // Helper functions
  calculateCampaignProgress: (campaign: Campaign) => number;
  getCampaignStatusLabel: (status: CampaignStatus) => string;
  getParticipantStatusLabel: (status: ParticipantStatus) => string;
  refreshCampaignData: () => Promise<void>;
}

/**
 * Custom hook that provides comprehensive functionality for managing brand marketing campaigns
 * @returns {CampaignsHookReturn} Object containing campaign state and operations
 */
const useCampaigns = (): CampaignsHookReturn => {
  // Access authentication context to get current user
  const { user } = useAuth();

  // Access brand context to get brand information
  const { brandId } = useBrand();

  // Verify user is a brand account, otherwise return limited functionality
  const isBrand = useMemo(() => user?.userType === UserType.BRAND, [user]);

  // Initialize toast notification system for success/error messages
  const toast = useToast();

  // Initialize query client for data fetching and cache invalidation
  const queryClient = useQueryClient();

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Set up query for fetching campaigns list with pagination and filters
  const campaignsQuery = useQuery(
    ['campaigns', brandId, currentPage, pageSize],
    async () => {
      if (!brandId || !isBrand) {
        return { campaigns: [], totalCount: 0, page: currentPage, pageSize: pageSize, hasMore: false };
      }
      return getCampaigns({}, currentPage, pageSize);
    },
    {
      enabled: !!brandId && isBrand,
      keepPreviousData: true,
      onError: (error: any) => {
        toast.error('Failed to load campaigns', error.message);
      },
    }
  );

  // Set up query for fetching campaign dashboard metrics
  const dashboardQuery = useQuery(
    ['campaignDashboard', brandId],
    async () => {
      if (!brandId || !isBrand) {
        return null;
      }
      return getCampaignDashboardData();
    },
    {
      enabled: !!brandId && isBrand,
      onError: (error: any) => {
        toast.error('Failed to load campaign dashboard data', error.message);
      },
    }
  );

  // Set up query for fetching campaign details by ID
  const getCampaignByIdQuery = useCallback(
    (campaignId: string) =>
      useQuery(
        ['campaignDetail', campaignId],
        async () => {
          if (!campaignId || !isBrand) {
            return null;
          }
          return getCampaignById(campaignId);
        },
        {
          enabled: !!campaignId && isBrand,
          onError: (error: any) => {
            toast.error('Failed to load campaign details', error.message);
          },
        }
      ),
    [isBrand]
  );

  // Set up query for fetching campaign participants
  const getCampaignParticipantsQuery = useCallback(
    (campaignId: string) =>
      useQuery(
        ['campaignParticipants', campaignId],
        async () => {
          if (!campaignId || !isBrand) {
            return null;
          }
          // TODO: Implement API endpoint for fetching campaign participants
          return null;
        },
        {
          enabled: !!campaignId && isBrand,
          onError: (error: any) => {
            toast.error('Failed to load campaign participants', error.message);
          },
        }
      ),
    [isBrand]
  );

  // Set up query for fetching campaign analytics
  const getCampaignAnalyticsQuery = useCallback(
    (campaignId: string) =>
      useQuery(
        ['campaignAnalytics', campaignId],
        async () => {
          if (!campaignId || !isBrand) {
            return null;
          }
          return getCampaignAnalytics(campaignId);
        },
        {
          enabled: !!campaignId && isBrand,
          onError: (error: any) => {
            toast.error('Failed to load campaign analytics', error.message);
          },
        }
      ),
    [isBrand]
  );

  // Set up mutation for creating new campaign
  const createCampaignMutation = useMutation(
    async (campaignData: CreateCampaignRequest) => {
      return createCampaign(campaignData);
    },
    {
      onSuccess: () => {
        toast.success('Campaign created successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to create campaign', error.message);
      },
    }
  );

  // Set up mutation for updating existing campaign
  const updateCampaignMutation = useMutation(
    async ({ campaignId, campaignData }: { campaignId: string; campaignData: UpdateCampaignRequest }) => {
      return updateCampaign(campaignId, campaignData);
    },
    {
      onSuccess: () => {
        toast.success('Campaign updated successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update campaign', error.message);
      },
    }
  );

  // Set up mutation for changing campaign status
  const changeCampaignStatusMutation = useMutation(
    async ({ campaignId, status }: { campaignId: string; status: CampaignStatus }) => {
      return changeCampaignStatus(campaignId, status);
    },
    {
      onSuccess: () => {
        toast.success('Campaign status updated successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update campaign status', error.message);
      },
    }
  );

  // Set up mutation for adding creator participants to campaign
  const addCreatorToCampaignMutation = useMutation(
    async (participantData: AddParticipantRequest) => {
      return addCreatorToCampaign(participantData);
    },
    {
      onSuccess: () => {
        toast.success('Creator added to campaign successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to add creator to campaign', error.message);
      },
    }
  );

  // Set up mutation for removing creator participants from campaign
  const removeCreatorFromCampaignMutation = useMutation(
    async ({ campaignId, participantId }: { campaignId: string; participantId: string }) => {
      return removeCreatorFromCampaign(campaignId, participantId);
    },
    {
      onSuccess: () => {
        toast.success('Creator removed from campaign successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to remove creator from campaign', error.message);
      },
    }
  );

  // Set up mutation for updating participant status
  const updateParticipantStatusMutation = useMutation(
    async (participantId: string, status: ParticipantStatus) => {
      return updateParticipantStatus(participantId, status);
    },
    {
      onSuccess: () => {
        toast.success('Participant status updated successfully!');
        queryClient.invalidateQueries(['campaigns', brandId]);
      },
      onError: (error: any) => {
        toast.error('Failed to update participant status', error.message);
      },
    }
  );

  // Create function to get campaigns with filtering options
  const getCampaigns = useCallback(
    async (filters?: CampaignFilters, page: number = 1, pageSize: number = 10): Promise<CampaignListResponse> => {
      if (!brandId) {
        throw new Error('Brand ID is required to fetch campaigns');
      }
      let params: any = { page, pageSize };
      if (filters) {
        params = { ...params, ...filters };
      }
      return await api.get<CampaignListResponse>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns`, params);
    },
    [brandId]
  );

  // Create function to get campaign dashboard data
  const getCampaignDashboardData = useCallback(async (): Promise<CampaignDashboardData> => {
    if (!brandId) {
      throw new Error('Brand ID is required to fetch campaign dashboard data');
    }
    return await api.get<CampaignDashboardData>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/dashboard`);
  }, [brandId]);

  // Create function to get single campaign by ID
  const getCampaignById = useCallback(async (campaignId: string): Promise<CampaignDetail> => {
    if (!brandId) {
      throw new Error('Brand ID is required to fetch campaign details');
    }
    return await api.get<CampaignDetail>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${campaignId}`);
  }, [brandId]);

  // Create function to get campaign analytics
  const getCampaignAnalytics = useCallback(async (campaignId: string): Promise<CampaignMetrics> => {
    if (!brandId) {
      throw new Error('Brand ID is required to fetch campaign analytics');
    }
    return await api.get<CampaignMetrics>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${campaignId}/analytics`);
  }, [brandId]);

  // Create function to create new campaign
  const createCampaign = useCallback(async (campaignData: CreateCampaignRequest): Promise<Campaign> => {
    if (!brandId) {
      throw new Error('Brand ID is required to create a campaign');
    }
    return await api.post<Campaign>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns`, campaignData);
  }, [brandId]);

  // Create function to update existing campaign
  const updateCampaign = useCallback(
    async (campaignId: string, campaignData: UpdateCampaignRequest): Promise<Campaign> => {
      if (!brandId) {
        throw new Error('Brand ID is required to update a campaign');
      }
      return await api.put<Campaign>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${campaignId}`, campaignData);
    },
    [brandId]
  );

  // Create function to change campaign status
  const changeCampaignStatus = useCallback(
    async (campaignId: string, status: CampaignStatus): Promise<Campaign> => {
      if (!brandId) {
        throw new Error('Brand ID is required to change campaign status');
      }
      return await api.patch<Campaign>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${campaignId}/status`, { status });
    },
    [brandId]
  );

  // Create function to add creator to campaign
  const addCreatorToCampaign = useCallback(
    async (participantData: AddParticipantRequest): Promise<CampaignParticipant> => {
      if (!brandId) {
        throw new Error('Brand ID is required to add a creator to a campaign');
      }
      return await api.post<CampaignParticipant>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${participantData.campaignId}/participants`, participantData);
    },
    [brandId]
  );

  // Create function to remove creator from campaign
  const removeCreatorFromCampaign = useCallback(
    async (campaignId: string, participantId: string): Promise<void> => {
      if (!brandId) {
        throw new Error('Brand ID is required to remove a creator from a campaign');
      }
      return await api.delete<void>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/${campaignId}/participants/${participantId}`);
    },
    [brandId]
  );

  // Create function to update participant status
  const updateParticipantStatus = useCallback(
    async (participantId: string, status: ParticipantStatus): Promise<CampaignParticipant> => {
      if (!brandId) {
        throw new Error('Brand ID is required to update participant status');
      }
      return await api.patch<CampaignParticipant>(`${API_ENDPOINTS.BRANDS}/${brandId}/campaigns/participants/${participantId}/status`, { status });
    },
    [brandId]
  );

  // Create function to calculate campaign progress percentage
  const calculateCampaignProgress = useCallback((campaign: Campaign): number => {
    const totalDays = campaign.endDate.getTime() - campaign.startDate.getTime();
    const daysPassed = Date.now() - campaign.startDate.getTime();
    return Math.min(100, (daysPassed / totalDays) * 100);
  }, []);

  // Create function to get campaign status label
  const getCampaignStatusLabel = useCallback((status: CampaignStatus): string => {
    switch (status) {
      case CampaignStatus.PLANNING:
        return 'Planning';
      case CampaignStatus.ACTIVE:
        return 'Active';
      case CampaignStatus.PAUSED:
        return 'Paused';
      case CampaignStatus.COMPLETED:
        return 'Completed';
      case CampaignStatus.ARCHIVED:
        return 'Archived';
      default:
        return 'Unknown';
    }
  }, []);

  // Create function to get participant status label
  const getParticipantStatusLabel = useCallback((status: ParticipantStatus): string => {
    switch (status) {
      case ParticipantStatus.INVITED:
        return 'Invited';
      case ParticipantStatus.NEGOTIATING:
        return 'Negotiating';
      case ParticipantStatus.CONTRACTED:
        return 'Contracted';
      case ParticipantStatus.IN_PROGRESS:
        return 'In Progress';
      case ParticipantStatus.COMPLETED:
        return 'Completed';
      case ParticipantStatus.CANCELLED:
        return 'Cancelled';
      case ParticipantStatus.DECLINED:
        return 'Declined';
      default:
        return 'Unknown';
    }
  }, []);

  // Create function to refresh campaign data
  const refreshCampaignData = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries(['campaigns', brandId]);
    await queryClient.invalidateQueries(['campaignDashboard', brandId]);
  }, [brandId, queryClient]);

  // Return object with campaign state and functions
  return {
    campaigns: campaignsQuery.data?.campaigns,
    totalCount: campaignsQuery.data?.totalCount,
    currentPage,
    pageSize,
    hasMorePages: !!campaignsQuery.data && campaignsQuery.data.page * campaignsQuery.data.pageSize < campaignsQuery.data.totalCount,
    isLoading: campaignsQuery.isLoading,
    error: campaignsQuery.error?.message || null,

    dashboardData: dashboardQuery.data,
    dashboardLoading: dashboardQuery.isLoading,

    campaignDetail: getCampaignByIdQuery("").data,
    campaignDetailLoading: getCampaignByIdQuery("").isLoading,
    campaignDetailError: getCampaignByIdQuery("").error?.message || null,

    campaignAnalytics: getCampaignAnalyticsQuery("").data,
    campaignAnalyticsLoading: getCampaignAnalyticsQuery("").isLoading,

    getCampaigns,
    getCampaignDashboardData,
    getCampaignById,
    getCampaignAnalytics,

    createCampaign,
    updateCampaign,
    changeCampaignStatus,
    addCreatorToCampaign,
    removeCreatorFromCampaign,
    updateParticipantStatus,

    calculateCampaignProgress,
    getCampaignStatusLabel,
    getParticipantStatusLabel,
    refreshCampaignData,

  };
};

export default useCampaigns;

export interface CampaignsHookReturn {
  campaigns: Campaign[] | undefined;
  totalCount: number | undefined;
  currentPage: number;
  pageSize: number;
  hasMorePages: boolean;
  isLoading: boolean;
  error: string | null;
  dashboardData: CampaignDashboardData | undefined;
  dashboardLoading: boolean;
  campaignDetail: CampaignDetail | undefined;
  campaignDetailLoading: boolean;
  campaignDetailError: string | null;
  campaignAnalytics: CampaignMetrics | undefined;
  campaignAnalyticsLoading: boolean;
  getCampaigns: (filters?: CampaignFilters, page?: number, pageSize?: number) => Promise<CampaignListResponse>;
  getCampaignDashboardData: () => Promise<CampaignDashboardData>;
  getCampaignById: (campaignId: string) => Promise<CampaignDetail>;
  getCampaignAnalytics: (campaignId: string) => Promise<CampaignMetrics>;
  createCampaign: (campaignData: CreateCampaignRequest) => Promise<Campaign>;
  updateCampaign: (campaignId: string, campaignData: UpdateCampaignRequest) => Promise<Campaign>;
  changeCampaignStatus: (campaignId: string, status: CampaignStatus) => Promise<Campaign>;
  addCreatorToCampaign: (participantData: AddParticipantRequest) => Promise<CampaignParticipant>;
  removeCreatorFromCampaign: (campaignId: string, participantId: string) => Promise<void>;
  updateParticipantStatus: (participantId: string, status: ParticipantStatus) => Promise<CampaignParticipant>;
  calculateCampaignProgress: (campaign: Campaign) => number;
  getCampaignStatusLabel: (status: CampaignStatus) => string;
  getParticipantStatusLabel: (status: ParticipantStatus) => string;
  refreshCampaignData: () => Promise<void>;
}