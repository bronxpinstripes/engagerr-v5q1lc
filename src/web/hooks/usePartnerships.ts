import { useState, useCallback, useMemo } from 'react'; // version: ^18.0.0
import { useQuery, useMutation, useQueryClient } from 'react-query'; // version: ^5.0.0
import { useAuth } from './useAuth';
import { useCreator } from './useCreator';
import { useBrand } from './useBrand';
import { useToast } from './useToast';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../lib/constants';
import {
  Partnership,
  PartnershipStatus,
  PartnershipDetail,
  Proposal,
  ProposalType,
  Contract,
  ContractStatus,
  Deliverable,
  DeliverableStatus,
  Payment,
  PaymentStatus,
  PartnershipProposalRequest,
  ProposalResponse,
  ContractRequest,
  DeliverableSubmission,
  DeliverableFeedback,
  PaymentRequest,
  ReleasePaymentRequest,
  PartnershipFilters,
  PartnershipListResponse,
} from '../types/partnership';
import { UserType } from '../types/user';

/**
 * Interface defining the return type of the usePartnerships hook.
 * This interface encapsulates all the partnership-related data and functions
 * that are exposed by the hook for use in React components.
 */
export interface PartnershipsHookReturn {
  /** Array of partnerships based on current filters and pagination */
  partnerships: Partnership[];
  /** Total number of partnerships matching the current filters */
  totalCount: number;
  /** Current page number in the partnership list */
  currentPage: number;
  /** Number of partnerships displayed per page */
  pageSize: number;
  /** Indicates whether there are more pages of partnerships available */
  hasMorePages: boolean;
  /** Indicates whether the partnership list is currently loading */
  isLoading: boolean;
  /** Error message if there was an error loading the partnership list */
  error: string | null;
  /** Detailed information for a single partnership */
  partnershipDetail: PartnershipDetail | null;
  /** Indicates whether the partnership detail is currently loading */
  partnershipDetailLoading: boolean;
  /** Error message if there was an error loading the partnership detail */
  partnershipDetailError: string | null;

  /** Function to fetch partnerships with filtering options */
  getPartnerships: (filters?: PartnershipFilters, page?: number, pageSize?: number) => Promise<PartnershipListResponse>;
  /** Function to fetch a single partnership by its ID */
  getPartnershipById: (partnershipId: string) => Promise<PartnershipDetail>;
  /** Function to create a new partnership proposal */
  createProposal: (proposalData: PartnershipProposalRequest) => Promise<Proposal>;
  /** Function to respond to a partnership proposal */
  respondToProposal: (response: ProposalResponse) => Promise<Partnership>;
  /** Function to create a contract for a partnership */
  createContract: (contractData: ContractRequest) => Promise<Contract>;
  /** Function to sign a partnership contract */
  signContract: (contractId: string) => Promise<Contract>;
  /** Function to submit deliverables for a partnership */
  submitDeliverable: (submission: DeliverableSubmission) => Promise<Deliverable>;
  /** Function to provide feedback on deliverables */
  provideDeliverableFeedback: (feedback: DeliverableFeedback) => Promise<Deliverable>;
  /** Function to make a payment for a partnership */
  makePayment: (paymentData: PaymentRequest) => Promise<Payment>;
  /** Function to release a payment from escrow */
  releasePayment: (releaseRequest: ReleasePaymentRequest) => Promise<Payment>;
  /** Function to update the status of a partnership */
  updatePartnershipStatus: (partnershipId: string, status: PartnershipStatus) => Promise<Partnership>;

  /** Function to check if the current user can create a proposal */
  canCreateProposal: (targetUserId: string) => boolean;
  /** Function to check if the current user can respond to a proposal */
  canRespondToProposal: (proposalId: string) => boolean;
  /** Function to check if the current user can submit deliverables */
  canSubmitDeliverables: (deliverableId: string) => boolean;

  /** Function to get a user-friendly label for a partnership status */
  getPartnershipStatusLabel: (status: PartnershipStatus) => string;
  /** Function to refresh partnership data */
  refreshPartnershipData: () => Promise<void>;
}

/**
 * Custom hook that provides functionality for managing partnerships between creators and brands
 * @returns {PartnershipsHookReturn} Object containing partnership state and operations
 */
export const usePartnerships = (): PartnershipsHookReturn => {
  // Access authentication context to get current user
  const { user } = useAuth();

  // Determine if user is creator or brand
  const { creator } = useCreator();
  const { brand } = useBrand();

  // Access creator or brand context as appropriate
  const isCreator = user?.userType === UserType.CREATOR;
  const isBrand = user?.userType === UserType.BRAND;

  // Initialize toast notification system for success/error messages
  const toast = useToast();

  // Initialize query client for data fetching and cache invalidation
  const queryClient = useQueryClient();

  // Set up query for fetching partnerships list with pagination and filters
  const {
    data: partnershipsData,
    isLoading,
    error,
    refetch: fetchPartnerships,
  } = useQuery<PartnershipListResponse, Error>(
    ['partnerships'],
    async () => {
      // Default values for page and pageSize
      const page = 1;
      const pageSize = 10;
      // Construct the API URL with query parameters
      let apiUrl = `${API_ENDPOINTS.PARTNERSHIPS}?page=${page}&pageSize=${pageSize}`;

      // Add brandId or creatorId to the query based on user type
      if (isBrand && brand?.id) {
        apiUrl += `&brandId=${brand.id}`;
      } else if (isCreator && creator?.id) {
        apiUrl += `&creatorId=${creator.id}`;
      }

      // Make the API request
      return await api.get<PartnershipListResponse>(apiUrl);
    },
    {
      enabled: !!user, // Only run the query if the user is authenticated
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (err: any) => {
        toast.error('Failed to load partnerships', err?.message);
      },
    }
  );

  // Extract partnerships, totalCount, currentPage, pageSize, and hasMorePages from partnershipsData
  const partnerships = partnershipsData?.partnerships || [];
  const totalCount = partnershipsData?.totalCount || 0;
  const currentPage = partnershipsData?.page || 1;
  const pageSize = partnershipsData?.pageSize || 10;
  const hasMorePages = partnershipsData?.hasMore || false;

  // Set up query for fetching partnership details by ID
  const {
    data: partnershipDetail,
    isLoading: partnershipDetailLoading,
    error: partnershipDetailError,
    refetch: fetchPartnershipDetail,
  } = useQuery<PartnershipDetail, Error>(
    ['partnershipDetail'],
    async () => {
      // Construct the API URL with query parameters
      const partnershipId = 'your_partnership_id'; // Replace with actual partnership ID
      return await api.get<PartnershipDetail>(`${API_ENDPOINTS.PARTNERSHIPS}/${partnershipId}`);
    },
    {
      enabled: false, // Disable automatic execution
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (err: any) => {
        toast.error('Failed to load partnership details', err?.message);
      },
    }
  );

  // Set up query for fetching partnership proposals
  // Set up mutation for creating new partnership proposal
  // Set up mutation for responding to partnership proposal
  // Set up mutation for creating partnership contract
  // Set up mutation for signing partnership contract
  // Set up mutation for submitting deliverables
  // Set up mutation for providing feedback on deliverables
  // Set up mutation for making payments
  // Set up mutation for releasing payments from escrow
  // Set up mutation for updating partnership status

  // Create function to get partnerships with filtering options
  const getPartnerships = useCallback(
    async (filters?: PartnershipFilters, page: number = 1, pageSize: number = 10): Promise<PartnershipListResponse> => {
      // Construct the API URL with query parameters
      let apiUrl = `${API_ENDPOINTS.PARTNERSHIPS}?page=${page}&pageSize=${pageSize}`;

      // Add brandId or creatorId to the query based on user type
      if (isBrand && brand?.id) {
        apiUrl += `&brandId=${brand.id}`;
      } else if (isCreator && creator?.id) {
        apiUrl += `&creatorId=${creator.id}`;
      }

      // Add filters to the query
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            apiUrl += `&${key}=${value}`;
          }
        });
      }

      // Make the API request
      return await api.get<PartnershipListResponse>(apiUrl);
    },
    [isBrand, brand, isCreator, creator]
  );

  // Create function to get single partnership by ID
  const getPartnershipById = useCallback(
    async (partnershipId: string): Promise<PartnershipDetail> => {
      try {
        const partnership = await api.get<PartnershipDetail>(`${API_ENDPOINTS.PARTNERSHIPS}/${partnershipId}`);
        return partnership;
      } catch (err: any) {
        toast.error('Failed to load partnership details', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to create new partnership proposal
  const createProposal = useCallback(
    async (proposalData: PartnershipProposalRequest): Promise<Proposal> => {
      try {
        const proposal = await api.post<Proposal>(`${API_ENDPOINTS.PARTNERSHIPS}/proposals`, proposalData);
        return proposal;
      } catch (err: any) {
        toast.error('Failed to create proposal', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to respond to partnership proposal
  const respondToProposal = useCallback(
    async (response: ProposalResponse): Promise<Partnership> => {
      try {
        const partnership = await api.post<Partnership>(`${API_ENDPOINTS.PARTNERSHIPS}/proposals/${response.proposalId}/respond`, response);
        return partnership;
      } catch (err: any) {
        toast.error('Failed to respond to proposal', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to create a contract for partnership
  const createContract = useCallback(
    async (contractData: ContractRequest): Promise<Contract> => {
      try {
        const contract = await api.post<Contract>(`${API_ENDPOINTS.PARTNERSHIPS}/contracts`, contractData);
        return contract;
      } catch (err: any) {
        toast.error('Failed to create contract', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to sign partnership contract
  const signContract = useCallback(
    async (contractId: string): Promise<Contract> => {
      try {
        const contract = await api.post<Contract>(`${API_ENDPOINTS.PARTNERSHIPS}/contracts/${contractId}/sign`);
        return contract;
      } catch (err: any) {
        toast.error('Failed to sign contract', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to submit deliverables
  const submitDeliverable = useCallback(
    async (submission: DeliverableSubmission): Promise<Deliverable> => {
      try {
        const deliverable = await api.post<Deliverable>(`${API_ENDPOINTS.PARTNERSHIPS}/deliverables/${submission.deliverableId}/submit`, submission);
        return deliverable;
      } catch (err: any) {
        toast.error('Failed to submit deliverable', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to provide feedback on deliverables
  const provideDeliverableFeedback = useCallback(
    async (feedback: DeliverableFeedback): Promise<Deliverable> => {
      try {
        const deliverable = await api.post<Deliverable>(`${API_ENDPOINTS.PARTNERSHIPS}/deliverables/${feedback.deliverableId}/feedback`, feedback);
        return deliverable;
      } catch (err: any) {
        toast.error('Failed to provide deliverable feedback', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to process payment
  const makePayment = useCallback(
    async (paymentData: PaymentRequest): Promise<Payment> => {
      try {
        const payment = await api.post<Payment>(`${API_ENDPOINTS.PARTNERSHIPS}/payments`, paymentData);
        return payment;
      } catch (err: any) {
        toast.error('Failed to make payment', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to release payment from escrow
  const releasePayment = useCallback(
    async (releaseRequest: ReleasePaymentRequest): Promise<Payment> => {
      try {
        const payment = await api.post<Payment>(`${API_ENDPOINTS.PARTNERSHIPS}/payments/${releaseRequest.paymentId}/release`, releaseRequest);
        return payment;
      } catch (err: any) {
        toast.error('Failed to release payment', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to update partnership status
  const updatePartnershipStatus = useCallback(
    async (partnershipId: string, status: PartnershipStatus): Promise<Partnership> => {
      try {
        const partnership = await api.patch<Partnership>(`${API_ENDPOINTS.PARTNERSHIPS}/${partnershipId}`, { status });
        return partnership;
      } catch (err: any) {
        toast.error('Failed to update partnership status', err?.message);
        throw err;
      }
    },
    [toast]
  );

  // Create function to check if user can create proposal
  const canCreateProposal = useCallback(
    (targetUserId: string): boolean => {
      // Implement logic to check if the current user can create a proposal for the target user
      // For example, check if the current user is a brand and the target user is a creator
      return isBrand && !!targetUserId;
    },
    [isBrand]
  );

  // Create function to check if user can respond to proposal
  const canRespondToProposal = useCallback(
    (proposalId: string): boolean => {
      // Implement logic to check if the current user can respond to the proposal
      // For example, check if the current user is the creator or brand associated with the proposal
      return !!proposalId; // Placeholder implementation
    },
    []
  );

  // Create function to check if user can submit deliverables
  const canSubmitDeliverables = useCallback(
    (deliverableId: string): boolean => {
      // Implement logic to check if the current user can submit deliverables for the given deliverable
      // For example, check if the current user is the creator associated with the partnership
      return !!deliverableId; // Placeholder implementation
    },
    []
  );

  // Create function to get partnership status label
  const getPartnershipStatusLabel = useCallback(
    (status: PartnershipStatus): string => {
      // Implement logic to return a user-friendly label for the given partnership status
      switch (status) {
        case PartnershipStatus.PROPOSED:
          return 'Proposed';
        case PartnershipStatus.NEGOTIATING:
          return 'Negotiating';
        case PartnershipStatus.ACCEPTED:
          return 'Accepted';
        case PartnershipStatus.CONTRACT_PENDING:
          return 'Contract Pending';
        case PartnershipStatus.CONTRACT_SIGNED:
          return 'Contract Signed';
        case PartnershipStatus.IN_PROGRESS:
          return 'In Progress';
        case PartnershipStatus.COMPLETED:
          return 'Completed';
        case PartnershipStatus.CANCELLED:
          return 'Cancelled';
        case PartnershipStatus.DECLINED:
          return 'Declined';
        default:
          return 'Unknown';
      }
    },
    []
  );

  // Create function to refresh partnership data
  const refreshPartnershipData = useCallback(async (): Promise<void> => {
    try {
      await fetchPartnerships();
      toast.success('Partnership data refreshed');
    } catch (err: any) {
      toast.error('Failed to refresh partnership data', err?.message);
    }
  }, [fetchPartnerships, toast]);

  // Return object with partnership state and functions
  return {
    partnerships,
    totalCount,
    currentPage,
    pageSize,
    hasMorePages,
    isLoading,
    error: error?.message || null,
    partnershipDetail,
    partnershipDetailLoading,
    partnershipDetailError: partnershipDetailError?.message || null,

    getPartnerships,
    getPartnershipById,
    createProposal,
    respondToProposal,
    createContract,
    signContract,
    submitDeliverable,
    provideDeliverableFeedback,
    makePayment,
    releasePayment,
    updatePartnershipStatus,

    canCreateProposal,
    canRespondToProposal,
    canSubmitDeliverables,
    getPartnershipStatusLabel,
    refreshPartnershipData,
  };
};