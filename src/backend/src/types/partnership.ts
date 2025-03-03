/**
 * Partnership Types Definition
 * 
 * This module defines TypeScript interfaces, types, and enums for partnership-related 
 * data structures used throughout the Engagerr platform, including partnerships between
 * creators and brands, proposals, contracts, deliverables, milestones, and payment structures.
 */

import { CreatorTypes } from './creator';
import { BrandTypes } from './brand';
import { ContentTypes } from './content';
import { PlatformTypes } from './platform';

// Define all partnership-related types within a namespace
export namespace PartnershipTypes {
  /**
   * Core partnership entity representing a collaboration between a creator and brand
   */
  export interface Partnership {
    /** Unique identifier for the partnership */
    id: string;
    
    /** Reference to the creator involved in the partnership */
    creatorId: string;
    
    /** Creator object */
    creator: CreatorTypes.Creator;
    
    /** Reference to the brand involved in the partnership */
    brandId: string;
    
    /** Brand object */
    brand: BrandTypes.Brand;
    
    /** Reference to the campaign this partnership belongs to (optional) */
    campaignId: string;
    
    /** Current status of the partnership */
    status: PartnershipStatus;
    
    /** Partnership title */
    title: string;
    
    /** Partnership description */
    description: string;
    
    /** Total budget allocated for the partnership */
    budget: number;
    
    /** Currency code (e.g., USD) */
    currency: string;
    
    /** Platform fee amount */
    platformFee: number;
    
    /** Start date of the partnership */
    startDate: Date;
    
    /** End date of the partnership */
    endDate: Date;
    
    /** Proposals exchanged during negotiation */
    proposals: Proposal[];
    
    /** Legal contract for the partnership */
    contract: Contract;
    
    /** Content deliverables to be created */
    deliverables: Deliverable[];
    
    /** Payment milestones */
    milestones: Milestone[];
    
    /** Payment transactions */
    payments: Payment[];
    
    /** Additional partnership metadata */
    metadata: Record<string, any>;
    
    /** Whether the partnership is publicly visible */
    isPublic: boolean;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Status values for tracking the state of a partnership
   */
  export enum PartnershipStatus {
    /** Initial draft state */
    DRAFT = 'draft',
    
    /** Partnership proposal has been sent and is awaiting response */
    PROPOSAL_PENDING = 'proposal_pending',
    
    /** Parties are in active negotiation */
    NEGOTIATION = 'negotiation',
    
    /** Contract has been generated and is awaiting signatures */
    CONTRACT_PENDING = 'contract_pending',
    
    /** Partnership is active with work in progress */
    ACTIVE = 'active',
    
    /** All deliverables and payments have been completed */
    COMPLETED = 'completed',
    
    /** Partnership was cancelled before completion */
    CANCELLED = 'cancelled',
    
    /** Partnership has an active dispute */
    DISPUTED = 'disputed'
  }

  /**
   * Interface representing a partnership proposal from either creator or brand
   */
  export interface Proposal {
    /** Unique identifier for the proposal */
    id: string;
    
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Type of entity that initiated the proposal (creator/brand) */
    initiatorType: string;
    
    /** ID of the entity that initiated the proposal */
    initiatorId: string;
    
    /** Current status of the proposal */
    status: ProposalStatus;
    
    /** Proposal title */
    title: string;
    
    /** Proposal description and overview */
    description: string;
    
    /** Proposed budget */
    budget: number;
    
    /** Currency code (e.g., USD) */
    currency: string;
    
    /** Proposed deliverables */
    deliverables: ProposalDeliverable[];
    
    /** Proposed timeline with key dates */
    timeline: {
      startDate: Date;
      endDate: Date;
      milestones: {
        title: string;
        date: Date;
        description: string;
      }[];
    };
    
    /** Proposed terms and conditions */
    terms: {
      revisions: number;
      usageRights: string;
      exclusivity: string;
      additionalTerms: string[];
    };
    
    /** Reference to counter-proposal if this is a response */
    counterProposalId: string;
    
    /** Message included with acceptance/rejection/counter */
    responseMessage: string;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Interface representing a deliverable within a partnership proposal
   */
  export interface ProposalDeliverable {
    /** Platform where content will be published */
    platform: PlatformTypes.PlatformType;
    
    /** Type of content to be created */
    contentType: ContentTypes.ContentType;
    
    /** Description of the deliverable */
    description: string;
    
    /** Number of content pieces */
    quantity: number;
    
    /** Specific requirements for the deliverable */
    requirements: string;
    
    /** Due date for the deliverable */
    dueDate: Date;
  }

  /**
   * Status values for tracking the state of a partnership proposal
   */
  export enum ProposalStatus {
    /** Proposal is being drafted */
    DRAFT = 'draft',
    
    /** Proposal has been sent to the other party */
    SENT = 'sent',
    
    /** Proposal has been viewed by the recipient */
    VIEWED = 'viewed',
    
    /** Proposal has been accepted */
    ACCEPTED = 'accepted',
    
    /** A counter-proposal has been sent in response */
    COUNTERED = 'countered',
    
    /** Proposal has been declined */
    DECLINED = 'declined',
    
    /** Proposal has expired without response */
    EXPIRED = 'expired'
  }

  /**
   * Interface representing a legal contract for a partnership
   */
  export interface Contract {
    /** Unique identifier for the contract */
    id: string;
    
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Contract title */
    title: string;
    
    /** Current status of the contract */
    status: ContractStatus;
    
    /** Contract terms and conditions */
    terms: Record<string, any>;
    
    /** Contract version number */
    version: number;
    
    /** URL to the generated contract document */
    documentUrl: string;
    
    /** Whether the creator has signed the contract */
    creatorSigned: boolean;
    
    /** When the creator signed the contract */
    creatorSignedAt: Date;
    
    /** Whether the brand has signed the contract */
    brandSigned: boolean;
    
    /** When the brand signed the contract */
    brandSignedAt: Date;
    
    /** When the contract takes effect */
    effectiveDate: Date;
    
    /** When the contract expires */
    expirationDate: Date;
    
    /** Additional contract metadata */
    metadata: Record<string, any>;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Status values for tracking the state of a partnership contract
   */
  export enum ContractStatus {
    /** Contract is being drafted */
    DRAFT = 'draft',
    
    /** Contract is awaiting signatures from both parties */
    PENDING_SIGNATURES = 'pending_signatures',
    
    /** Contract has been signed by one party */
    PARTIALLY_SIGNED = 'partially_signed',
    
    /** Contract has been signed by both parties */
    SIGNED = 'signed',
    
    /** Contract is active and in effect */
    ACTIVE = 'active',
    
    /** Contract has been completed */
    COMPLETED = 'completed',
    
    /** Contract has been terminated early */
    TERMINATED = 'terminated',
    
    /** Contract has expired */
    EXPIRED = 'expired'
  }

  /**
   * Interface representing a content deliverable within a partnership
   */
  export interface Deliverable {
    /** Unique identifier for the deliverable */
    id: string;
    
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Reference to the milestone this deliverable is part of (optional) */
    milestoneId: string;
    
    /** Deliverable title */
    title: string;
    
    /** Deliverable description */
    description: string;
    
    /** Platform where the content will be published */
    platform: PlatformTypes.PlatformType;
    
    /** Type of content to be created */
    contentType: ContentTypes.ContentType;
    
    /** Specific requirements for the deliverable */
    requirements: string;
    
    /** Current status of the deliverable */
    status: DeliverableStatus;
    
    /** Due date for the deliverable */
    dueDate: Date;
    
    /** URL to the submitted content */
    contentUrl: string;
    
    /** Reference to the content item in the system (once created) */
    contentId: string;
    
    /** When the deliverable was submitted */
    submittedAt: Date;
    
    /** When the deliverable was approved */
    approvedAt: Date;
    
    /** History of revision requests */
    revisionRequests: RevisionRequest[];
    
    /** Additional deliverable metadata */
    metadata: Record<string, any>;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Status values for tracking the state of a deliverable
   */
  export enum DeliverableStatus {
    /** Work has not yet begun */
    NOT_STARTED = 'not_started',
    
    /** Work is in progress */
    IN_PROGRESS = 'in_progress',
    
    /** Content has been submitted for review */
    SUBMITTED = 'submitted',
    
    /** Revisions have been requested */
    REVISION_REQUESTED = 'revision_requested',
    
    /** Content has been approved */
    APPROVED = 'approved',
    
    /** Content has been rejected */
    REJECTED = 'rejected',
    
    /** Deliverable is past its due date without submission */
    OVERDUE = 'overdue'
  }

  /**
   * Interface representing a request for revisions to a deliverable
   */
  export interface RevisionRequest {
    /** Unique identifier for the revision request */
    id: string;
    
    /** Reference to the deliverable */
    deliverableId: string;
    
    /** ID of the user requesting the revision */
    requesterId: string;
    
    /** Type of user requesting the revision (brand/creator) */
    requesterType: string;
    
    /** Detailed description of the requested changes */
    requestDetails: string;
    
    /** When the revision was requested */
    requestedAt: Date;
    
    /** When the revision was resolved */
    resolvedAt: Date;
  }

  /**
   * Interface representing a milestone within a partnership
   */
  export interface Milestone {
    /** Unique identifier for the milestone */
    id: string;
    
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Milestone title */
    title: string;
    
    /** Milestone description */
    description: string;
    
    /** Reference to the payment associated with this milestone */
    paymentId: string;
    
    /** Amount to be paid upon milestone completion */
    amount: number;
    
    /** Due date for the milestone */
    dueDate: Date;
    
    /** Current status of the milestone */
    status: MilestoneStatus;
    
    /** References to deliverables that are part of this milestone */
    deliverableIds: string[];
    
    /** Criteria for milestone completion */
    completionCriteria: Record<string, any>;
    
    /** When the milestone was completed */
    completedAt: Date;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Status values for tracking the state of a milestone
   */
  export enum MilestoneStatus {
    /** Milestone is upcoming */
    PENDING = 'pending',
    
    /** Work toward the milestone is in progress */
    IN_PROGRESS = 'in_progress',
    
    /** Milestone has been completed */
    COMPLETED = 'completed',
    
    /** Milestone is completed and payment is pending */
    PAYMENT_PENDING = 'payment_pending',
    
    /** Payment for the milestone has been released */
    PAYMENT_RELEASED = 'payment_released',
    
    /** Milestone is past its due date */
    OVERDUE = 'overdue',
    
    /** Milestone has been cancelled */
    CANCELLED = 'cancelled'
  }

  /**
   * Interface representing a payment within a partnership
   */
  export interface Payment {
    /** Unique identifier for the payment */
    id: string;
    
    /** Reference to the partnership */
    partnershipId: string;
    
    /** Reference to the milestone this payment is for (optional) */
    milestoneId: string;
    
    /** ID of the sender (payer) */
    senderId: string;
    
    /** ID of the recipient (payee) */
    recipientId: string;
    
    /** Payment amount */
    amount: number;
    
    /** Currency code (e.g., USD) */
    currency: string;
    
    /** Platform fee amount */
    platformFee: number;
    
    /** Current status of the payment */
    status: PaymentStatus;
    
    /** Payment description */
    description: string;
    
    /** Stripe payment intent ID */
    stripePaymentIntentId: string;
    
    /** Stripe transfer ID (for payouts to creators) */
    stripeTransferId: string;
    
    /** Reference to the escrow record */
    escrowId: string;
    
    /** When the payment is scheduled to occur */
    scheduledAt: Date;
    
    /** When the payment was processed */
    paidAt: Date;
    
    /** When the payment was released from escrow */
    releasedAt: Date;
    
    /** Additional payment metadata */
    metadata: Record<string, any>;
    
    /** Creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
  }

  /**
   * Status values for tracking the state of a payment
   */
  export enum PaymentStatus {
    /** Payment is waiting to be initiated */
    PENDING = 'pending',
    
    /** Payment is being processed */
    PROCESSING = 'processing',
    
    /** Payment has been completed */
    COMPLETED = 'completed',
    
    /** Payment is being held in escrow */
    IN_ESCROW = 'in_escrow',
    
    /** Payment has been released from escrow */
    RELEASED = 'released',
    
    /** Payment failed */
    FAILED = 'failed',
    
    /** Payment was refunded */
    REFUNDED = 'refunded',
    
    /** Payment is in dispute */
    DISPUTED = 'disputed',
    
    /** Payment was cancelled */
    CANCELLED = 'cancelled'
  }

  /**
   * Interface for a simplified partnership summary used in listings
   */
  export interface PartnershipSummary {
    /** Partnership ID */
    partnershipId: string;
    
    /** Creator ID */
    creatorId: string;
    
    /** Creator name */
    creatorName: string;
    
    /** Brand ID */
    brandId: string;
    
    /** Brand name */
    brandName: string;
    
    /** Brand logo URL */
    brandLogo: string;
    
    /** Campaign ID */
    campaignId: string;
    
    /** Campaign title */
    campaignTitle: string;
    
    /** Partnership title */
    title: string;
    
    /** Partnership status */
    status: PartnershipStatus;
    
    /** Start date */
    startDate: Date;
    
    /** End date */
    endDate: Date;
    
    /** Total budget */
    budget: number;
    
    /** Total number of deliverables */
    deliverableCount: number;
    
    /** Number of completed deliverables */
    completedDeliverables: number;
    
    /** Platforms used in the partnership */
    platforms: PlatformTypes.PlatformType[];
    
    /** Content types included in the partnership */
    contentTypes: ContentTypes.ContentType[];
    
    /** Whether the partnership is publicly visible */
    isPublic: boolean;
  }

  /**
   * Input data for creating a new partnership
   */
  export interface CreatePartnershipInput {
    /** Creator ID */
    creatorId: string;
    
    /** Brand ID */
    brandId: string;
    
    /** Campaign ID (optional) */
    campaignId: string;
    
    /** Partnership title */
    title: string;
    
    /** Partnership description */
    description: string;
    
    /** Total budget */
    budget: number;
    
    /** Currency code */
    currency: string;
    
    /** Start date */
    startDate: Date;
    
    /** End date */
    endDate: Date;
    
    /** Additional metadata */
    metadata: Record<string, any>;
    
    /** Whether the partnership is publicly visible */
    isPublic: boolean;
  }

  /**
   * Input data for creating a new partnership proposal
   */
  export interface CreateProposalInput {
    /** Partnership ID */
    partnershipId: string;
    
    /** Type of entity initiating the proposal */
    initiatorType: string;
    
    /** ID of the entity initiating the proposal */
    initiatorId: string;
    
    /** Proposal title */
    title: string;
    
    /** Proposal description */
    description: string;
    
    /** Proposed budget */
    budget: number;
    
    /** Currency code */
    currency: string;
    
    /** Proposed deliverables */
    deliverables: ProposalDeliverable[];
    
    /** Proposed timeline */
    timeline: object;
    
    /** Proposed terms */
    terms: object;
  }

  /**
   * Input data for creating a new partnership contract
   */
  export interface CreateContractInput {
    /** Partnership ID */
    partnershipId: string;
    
    /** Contract title */
    title: string;
    
    /** Contract terms and conditions */
    terms: Record<string, any>;
    
    /** When the contract takes effect */
    effectiveDate: Date;
    
    /** When the contract expires */
    expirationDate: Date;
    
    /** Additional metadata */
    metadata: Record<string, any>;
  }

  /**
   * Input data for creating a new deliverable
   */
  export interface CreateDeliverableInput {
    /** Partnership ID */
    partnershipId: string;
    
    /** Milestone ID (optional) */
    milestoneId: string;
    
    /** Deliverable title */
    title: string;
    
    /** Deliverable description */
    description: string;
    
    /** Platform */
    platform: PlatformTypes.PlatformType;
    
    /** Content type */
    contentType: ContentTypes.ContentType;
    
    /** Requirements */
    requirements: string;
    
    /** Due date */
    dueDate: Date;
  }

  /**
   * Input data for creating a new milestone
   */
  export interface CreateMilestoneInput {
    /** Partnership ID */
    partnershipId: string;
    
    /** Milestone title */
    title: string;
    
    /** Milestone description */
    description: string;
    
    /** Amount to be paid upon completion */
    amount: number;
    
    /** Due date */
    dueDate: Date;
    
    /** Deliverable IDs included in this milestone */
    deliverableIds: string[];
    
    /** Completion criteria */
    completionCriteria: Record<string, any>;
  }
}

// Export the namespace for those who want to access all types
export { PartnershipTypes };

// Re-export individual interfaces and enums for direct import
export type Partnership = PartnershipTypes.Partnership;
export type Proposal = PartnershipTypes.Proposal;
export type ProposalDeliverable = PartnershipTypes.ProposalDeliverable;
export type Contract = PartnershipTypes.Contract;
export type Deliverable = PartnershipTypes.Deliverable;
export type RevisionRequest = PartnershipTypes.RevisionRequest;
export type Milestone = PartnershipTypes.Milestone;
export type Payment = PartnershipTypes.Payment;
export type PartnershipSummary = PartnershipTypes.PartnershipSummary;
export type CreatePartnershipInput = PartnershipTypes.CreatePartnershipInput;
export type CreateProposalInput = PartnershipTypes.CreateProposalInput;
export type CreateContractInput = PartnershipTypes.CreateContractInput;
export type CreateDeliverableInput = PartnershipTypes.CreateDeliverableInput;
export type CreateMilestoneInput = PartnershipTypes.CreateMilestoneInput;

// Re-export enums
export import PartnershipStatus = PartnershipTypes.PartnershipStatus;
export import ProposalStatus = PartnershipTypes.ProposalStatus;
export import ContractStatus = PartnershipTypes.ContractStatus;
export import DeliverableStatus = PartnershipTypes.DeliverableStatus;
export import MilestoneStatus = PartnershipTypes.MilestoneStatus;
export import PaymentStatus = PartnershipTypes.PaymentStatus;