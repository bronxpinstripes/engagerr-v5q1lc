/**
 * Partnership Types
 * 
 * This file contains TypeScript type definitions for partnerships between creators and brands on the Engagerr platform.
 * It defines the core structures for proposals, contracts, deliverables, and the overall partnership lifecycle.
 */

import { Creator } from './creator';
import { Brand } from './brand';
import { PlatformType } from './platform';
import { ContentType } from './content';

/**
 * Status values for tracking the lifecycle stages of a partnership
 */
export enum PartnershipStatus {
  PROPOSED = 'proposed',
  NEGOTIATING = 'negotiating',
  ACCEPTED = 'accepted',
  CONTRACT_PENDING = 'contract_pending',
  CONTRACT_SIGNED = 'contract_signed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DECLINED = 'declined'
}

/**
 * Status values for tracking the state of a partnership contract
 */
export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_BRAND_SIGNATURE = 'pending_brand_signature',
  PENDING_CREATOR_SIGNATURE = 'pending_creator_signature',
  SIGNED = 'signed',
  AMENDED = 'amended',
  TERMINATED = 'terminated',
  EXPIRED = 'expired'
}

/**
 * Status values for tracking payment progression within a partnership
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  HELD_IN_ESCROW = 'held_in_escrow',
  RELEASED = 'released',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  DISPUTED = 'disputed'
}

/**
 * Status values for tracking deliverable completion status
 */
export enum DeliverableStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  REVISION_REQUESTED = 'revision_requested',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

/**
 * Types of partnership proposals based on origination and context
 */
export enum ProposalType {
  BRAND_INITIATED = 'brand_initiated',
  CREATOR_INITIATED = 'creator_initiated',
  CAMPAIGN_BASED = 'campaign_based',
  COUNTER_OFFER = 'counter_offer'
}

/**
 * Core entity for a partnership between a creator and brand
 */
export interface Partnership {
  id: string;
  brandId: string;
  creatorId: string;
  campaignId: string | null;
  status: PartnershipStatus;
  title: string;
  description: string;
  totalBudget: number;
  platformFee: number;
  startDate: Date;
  endDate: Date;
  contractId: string | null;
  proposedAt: Date;
  lastUpdatedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

/**
 * Detailed partnership information including related entities for UI display
 */
export interface PartnershipDetail {
  partnership: Partnership;
  creator: Creator;
  brand: Brand;
  contract: Contract | null;
  deliverables: Deliverable[];
  payments: Payment[];
  messages: number;
}

/**
 * Proposal for a partnership between creator and brand
 */
export interface Proposal {
  id: string;
  partnershipId: string;
  brandId: string;
  creatorId: string;
  proposalType: ProposalType;
  title: string;
  description: string;
  deliverables: ProposalDeliverable[];
  budget: number;
  timeline: {
    startDate: Date;
    endDate: Date;
  };
  termsAndConditions: string;
  status: string;
  version: number;
  previousVersionId: string | null;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Deliverable specification within a partnership proposal
 */
export interface ProposalDeliverable {
  id: string;
  platformType: PlatformType;
  contentType: ContentType;
  description: string;
  requirements: string;
  dueDate: Date;
  price: number;
}

/**
 * Legal contract between creator and brand for a partnership
 */
export interface Contract {
  id: string;
  partnershipId: string;
  brandId: string;
  creatorId: string;
  title: string;
  status: ContractStatus;
  terms: ContractTerms;
  brandSignedAt: Date | null;
  creatorSignedAt: Date | null;
  documentUrl: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Terms and conditions specified in a partnership contract
 */
export interface ContractTerms {
  deliverables: ProposalDeliverable[];
  totalCompensation: number;
  paymentSchedule: PaymentSchedule;
  startDate: Date;
  endDate: Date;
  revisionPolicy: string;
  approvalProcess: string;
  contentUsageRights: string;
  exclusivity: string;
  cancellationTerms: string;
  additionalTerms: string;
}

/**
 * Payment schedule options for partnership contracts
 */
export enum PaymentSchedule {
  UPFRONT = 'upfront',
  ON_COMPLETION = 'on_completion',
  SPLIT = 'split',
  MILESTONE_BASED = 'milestone_based'
}

/**
 * Content deliverable for a partnership
 */
export interface Deliverable {
  id: string;
  partnershipId: string;
  platformType: PlatformType;
  contentType: ContentType;
  description: string;
  requirements: string;
  dueDate: Date;
  status: DeliverableStatus;
  contentUrl: string | null;
  contentId: string | null;
  submissionNotes: string | null;
  feedbackNotes: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
}

/**
 * Payment transaction related to a partnership
 */
export interface Payment {
  id: string;
  partnershipId: string;
  amount: number;
  description: string;
  status: PaymentStatus;
  paymentType: string;
  stripePaymentId: string;
  platformFee: number;
  createdAt: Date;
  processedAt: Date | null;
  releasedAt: Date | null;
}

/**
 * Request data for creating a new partnership proposal
 */
export interface PartnershipProposalRequest {
  brandId: string;
  creatorId: string;
  campaignId: string | null;
  title: string;
  description: string;
  deliverables: DeliverableInput[];
  budget: number;
  startDate: Date;
  endDate: Date;
  termsAndConditions: string;
  proposalType: ProposalType;
}

/**
 * Input data for creating a deliverable specification
 */
export interface DeliverableInput {
  platformType: PlatformType;
  contentType: ContentType;
  description: string;
  requirements: string;
  dueDate: Date;
  price: number;
}

/**
 * Response data after creating a partnership proposal
 */
export interface PartnershipResponse {
  partnership: Partnership;
  proposal: Proposal;
}

/**
 * Response to a partnership proposal (accept, decline, counter)
 */
export interface ProposalResponse {
  action: 'accept' | 'decline' | 'counter';
  proposalId: string;
  partnershipId: string;
  message: string;
  counterProposal: PartnershipProposalRequest | null;
}

/**
 * Request data for creating a partnership contract
 */
export interface ContractRequest {
  partnershipId: string;
  title: string;
  terms: ContractTerms;
}

/**
 * Submission data for a completed deliverable
 */
export interface DeliverableSubmission {
  deliverableId: string;
  contentUrl: string;
  contentId: string | null;
  notes: string;
}

/**
 * Feedback on a submitted deliverable
 */
export interface DeliverableFeedback {
  deliverableId: string;
  status: 'approve' | 'request_revision' | 'reject';
  feedback: string;
}

/**
 * Request data for creating a payment
 */
export interface PaymentRequest {
  partnershipId: string;
  amount: number;
  description: string;
  paymentType: 'initial' | 'milestone' | 'final';
}

/**
 * Request data for releasing a payment from escrow
 */
export interface ReleasePaymentRequest {
  paymentId: string;
  note: string;
}

/**
 * Filtering options for partnership queries
 */
export interface PartnershipFilters {
  status: PartnershipStatus[];
  dateRange: {
    startDate?: Date;
    endDate?: Date;
  };
  budgetRange: {
    min?: number;
    max?: number;
  };
  brandId: string;
  creatorId: string;
  campaignId: string;
  search: string;
}

/**
 * Response format for listing partnerships with pagination
 */
export interface PartnershipListResponse {
  partnerships: Partnership[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}