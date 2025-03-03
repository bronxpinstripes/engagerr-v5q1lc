# src/backend/src/controllers/partnerships.ts
```typescript
import { Request, Response } from 'express'; // Express framework for handling HTTP requests and responses // v4.18.2
import {
  PartnershipTypes,
  PartnershipStatus,
  CreatePartnershipInput,
  Proposal,
  Contract,
  Deliverable,
  Payment,
} from '../types/partnership'; // Import partnership type definitions
import { ApiTypes, PaginationParams, ApiResponse, PaginatedResponse } from '../types/api'; // Import API response and pagination types
import { handleAsyncError, ValidationError, NotFoundError, AuthorizationError } from '../utils/errors'; // Higher-order function for consistent error handling
import { authenticate, requireRole, requirePermission, optionalAuth } from '../middlewares/auth'; // Middleware to authenticate requests
import { validate } from '../middlewares/validation'; // Middleware for request validation
import { logger } from '../utils/logger'; // Logging service for request handling
import {
  createPartnershipService,
  getPartnershipService,
  searchPartnershipsService,
  getCreatorPartnershipsService,
  getBrandPartnershipsService,
  updatePartnershipService,
  updatePartnershipStatusService,
  createProposalService,
  respondToProposalService,
  generateContractService,
  signContractService,
  createDeliverableService,
  updateDeliverableStatusService,
  createPartnershipPaymentService,
  releasePaymentService,
  createMilestoneService,
  completeMilestoneService,
  cancelPartnershipService,
  getPartnershipAnalyticsService
} from '../services/partnership'; // Service for creating partnerships

const express = require('express');
const router = express.Router();

/**
 * Creates a new partnership between a creator and brand
 */
const createPartnership = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  logger.info({ body: req.body }, 'Creating a new partnership');
  const partnershipData: CreatePartnershipInput = req.body;
  const userId = req.user.id;

  const partnership = await createPartnershipService(partnershipData);

  res.status(201).json({
    data: partnership,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Retrieves partnership details by ID
 */
const getPartnership = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const id: string = req.params.id;
  const includeDetails: boolean = req.query.includeDetails === 'true';

  const partnership = await getPartnershipService(id, includeDetails);

  res.status(200).json({
    data: partnership,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Searches for partnerships with filtering, sorting, and pagination
 */
const searchPartnerships = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const filters: any = req.query;
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 20;

  const result = await searchPartnershipsService(filters, page, limit);

  res.status(200).json({
    data: result.partnerships,
    pagination: {
      page: page,
      pageSize: limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPreviousPage: page > 1,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Retrieves partnerships for a specific creator
 */
const getCreatorPartnerships = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const creatorId: string = req.params.creatorId;
  const status: PartnershipStatus = req.query.status as PartnershipStatus;
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 20;

  const result = await getCreatorPartnershipsService(creatorId, status, page, limit);

  res.status(200).json({
    data: result.partnerships,
    pagination: {
      page: page,
      pageSize: limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPreviousPage: page > 1,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Retrieves partnerships for a specific brand
 */
const getBrandPartnerships = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const brandId: string = req.params.brandId;
  const status: PartnershipStatus = req.query.status as PartnershipStatus;
  const page: number = parseInt(req.query.page as string) || 1;
  const limit: number = parseInt(req.query.limit as string) || 20;

  const result = await getBrandPartnershipsService(brandId, status, page, limit);

  res.status(200).json({
    data: result.partnerships,
    pagination: {
      page: page,
      pageSize: limit,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPreviousPage: page > 1,
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Updates details of an existing partnership
 */
const updatePartnership = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const id: string = req.params.id;
  const updateData: any = req.body;

  const updatedPartnership = await updatePartnershipService(id, updateData);

  res.status(200).json({
    data: updatedPartnership,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Updates the status of a partnership
 */
const updatePartnershipStatus = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const id: string = req.params.id;
  const newStatus: PartnershipStatus = req.body.status;

  const updatedPartnership = await updatePartnershipStatusService(id, newStatus);

  res.status(200).json({
    data: updatedPartnership,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Creates a new proposal for a partnership
 */
const createProposal = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const proposalData: any = req.body;

  const proposal = await createProposalService(proposalData);

  res.status(201).json({
    data: proposal,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Responds to a partnership proposal (accept, reject, counter)
 */
const respondToProposal = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const proposalId: string = req.params.proposalId;
  const response: string = req.body.response;
  const counterProposalData: any = req.body.counterProposalData;

  const result = await respondToProposalService(proposalId, response, counterProposalData);

  res.status(200).json({
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Generates a contract for a partnership
 */
const generateContract = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const partnershipId: string = req.params.partnershipId;
  const contractData: any = req.body;

  const contract = await generateContractService(partnershipId, contractData);

  res.status(201).json({
    data: contract,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Records a signature on a partnership contract
 */
const signContract = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const partnershipId: string = req.params.partnershipId;
  const signerType: string = req.body.signerType;
  const signerId: string = req.body.signerId;

  const result = await signContractService(partnershipId, signerType, signerId);

  res.status(200).json({
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Creates a new deliverable for a partnership
 */
const createDeliverable = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const partnershipId: string = req.params.partnershipId;
  const deliverableData: any = req.body;

  const deliverable = await createDeliverableService(partnershipId, deliverableData);

  res.status(201).json({
    data: deliverable,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Updates the status of a partnership deliverable
 */
const updateDeliverableStatus = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const deliverableId: string = req.params.deliverableId;
  const newStatus: string = req.body.newStatus;
  const statusData: any = req.body.statusData;

  const deliverable = await updateDeliverableStatusService(deliverableId, newStatus, statusData);

  res.status(200).json({
    data: deliverable,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Creates a payment for a partnership
 */
const createPayment = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const partnershipId: string = req.params.partnershipId;
  const paymentData: any = req.body;

  const payment = await createPartnershipPaymentService(partnershipId, paymentData);

  res.status(201).json({
    data: payment,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Releases payment from escrow to creator upon deliverable completion
 */
const releasePayment = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
  const partnershipId: string = req.params.partnershipId;
  const paymentId: string = req.params.paymentId;
  const approvedById: string = req.user.id;

  const payment = await releasePaymentService(partnershipId, paymentId, approvedById);

  res.status(200).json({
    data: payment,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Creates a milestone for a partnership with associated deliverables
 */
const createMilestone = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const partnershipId: string = req.params.partnershipId;
    const milestoneData: any = req.body;

    const milestone = await createMilestoneService(partnershipId, milestoneData);

    res.status(201).json({
        data: milestone,
        meta: { timestamp: new Date().toISOString() },
    });
});

/**
 * Marks a milestone as completed and handles payment release
 */
const completeMilestone = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const milestoneId: string = req.params.milestoneId;
    const approvedById: string = req.user.id;

    const result = await completeMilestoneService(milestoneId, approvedById);

    res.status(200).json({
        data: result,
        meta: { timestamp: new Date().toISOString() },
    });
});

/**
 * Cancels a partnership and handles all related records
 */
const cancelPartnership = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const partnershipId: string = req.params.partnershipId;
    const reason: string = req.body.reason;
    const cancelledById: string = req.user.id;

    const partnership = await cancelPartnershipService(partnershipId, reason, cancelledById);

    res.status(200).json({
        data: partnership,
        meta: { timestamp: new Date().toISOString() },
    });
});

/**
 * Retrieves analytics data for a partnership
 */
const getPartnershipAnalytics = handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const partnershipId: string = req.params.partnershipId;

    const analytics = await getPartnershipAnalyticsService(partnershipId);

    res.status(200).json({
        data: analytics,
        meta: { timestamp: new Date().toISOString() },
    });
});

export {
    createPartnership,
    getPartnership,
    searchPartnerships,
    getCreatorPartnerships,
    getBrandPartnerships,
    updatePartnership,
    updatePartnershipStatus,
    createProposal,
    respondToProposal,
    generateContract,
    signContract,
    createDeliverable,
    updateDeliverableStatus,
    createPayment,
    releasePayment,
    createMilestone,
    completeMilestone,
    cancelPartnership,
    getPartnershipAnalytics
};