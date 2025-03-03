import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { supabaseClient as supabase, supabaseAdmin } from '../config/supabase';
import { 
  Payment, 
  PaymentStatus, 
  Escrow, 
  EscrowStatus, 
  Milestone, 
  MilestoneStatus, 
  Release, 
  ReleaseStatus, 
  Dispute, 
  DisputeStatus 
} from '../types/payment';
import { Partnership } from '../types/partnership';
import { logger } from '../utils/logger';
import { ApiError, ErrorCodes } from '../utils/errors';
import { getPaymentById, updatePaymentStatus } from '../models/payment';
import { getPartnershipById } from '../models/partnership';
import { transferToConnectedAccount } from '../integrations/stripe/connect';
import { PLATFORM_FEE_PERCENTAGE } from '../config/stripe';

/**
 * Service class that manages escrow functionality for marketplace transactions
 */
export class EscrowService {
  /**
   * Initializes the escrow service with required dependencies
   */
  constructor() {
    // Initialize Supabase client from configuration
    logger.info('EscrowService initialized');
  }

  /**
   * Creates an escrow record for a partnership payment
   * @param paymentData 
   * @returns {Promise<Escrow>} The created escrow record
   */
  async createEscrow(paymentData: Payment): Promise<Escrow> {
    logger.info({ paymentData }, 'Creating escrow record');

    // Validate payment data for escrow eligibility
    if (!paymentData.partnershipId || !paymentData.amount) {
      logger.error({ paymentData }, 'Invalid payment data for escrow creation');
      throw new ApiError('Invalid payment data for escrow creation', 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Calculate platform fee based on payment amount
    const platformFee = paymentData.platformFee;

    // Generate a unique escrow ID using uuidv4
    const escrowId = uuidv4();

    try {
      // Create escrow record in database with PENDING status
      const { data: escrow, error } = await supabaseAdmin
        .from('escrows')
        .insert<Partial<Escrow>>([{
          id: escrowId,
          paymentId: paymentData.id,
          partnershipId: paymentData.partnershipId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: EscrowStatus.PENDING,
          holdPeriod: 30, // Default hold period of 30 days
          autoReleaseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Auto-release after 30 days
          metadata: {
            platformFee: platformFee,
            paymentType: paymentData.type,
          },
        }])
        .select()
        .single();

      if (error) {
        logger.error({ error }, 'Failed to create escrow record in database');
        throw new ApiError('Failed to create escrow record', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Log escrow creation
      logger.info({ escrowId, paymentId: paymentData.id }, 'Escrow record created successfully');

      // Return created escrow record
      return escrow as Escrow;
    } catch (error: any) {
      logger.error({ error }, 'Error creating escrow record');
      throw new ApiError('Error creating escrow record', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Places funds in escrow for a partnership after payment confirmation
   * @param escrowId 
   * @param paymentId 
   * @returns {Promise<Escrow>} Updated escrow record
   */
  async holdFunds(escrowId: string, paymentId: string): Promise<Escrow> {
    logger.info({ escrowId, paymentId }, 'Placing funds in escrow');

    try {
      // Retrieve payment and escrow records
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        logger.error({ paymentError, paymentId }, 'Payment record not found');
        throw new ApiError('Payment record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        logger.error({ escrowError, escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      // Verify payment status is COMPLETED
      if (payment.status !== PaymentStatus.COMPLETED) {
        logger.error({ paymentStatus: payment.status }, 'Payment status is not COMPLETED');
        throw new ApiError('Payment status is not COMPLETED', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Update escrow status to FUNDED
      const { data: updatedEscrow, error: updateError } = await supabaseAdmin
        .from('escrows')
        .update({
          status: EscrowStatus.FUNDED,
          autoReleaseAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Auto-release after 30 days
        })
        .eq('id', escrowId)
        .select()
        .single();

      if (updateError || !updatedEscrow) {
        logger.error({ updateError, escrowId }, 'Failed to update escrow status to FUNDED');
        throw new ApiError('Failed to update escrow status', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Update payment status to IN_ESCROW
      await updatePaymentStatus(paymentId, PaymentStatus.IN_ESCROW);

      // Log successful fund placement in escrow
      logger.info({ escrowId, paymentId }, 'Funds successfully placed in escrow');

      // Return updated escrow record
      return updatedEscrow as Escrow;
    } catch (error: any) {
      logger.error({ error, escrowId, paymentId }, 'Error placing funds in escrow');
      throw new ApiError('Error placing funds in escrow', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Releases funds from escrow to the recipient
   * @param escrowId 
   * @param approvedById 
   * @param amount 
   * @returns {Promise<Release>} The release record
   */
  async releaseFunds(escrowId: string, approvedById: string, amount: number): Promise<Release> {
    logger.info({ escrowId, approvedById, amount }, 'Releasing funds from escrow');

    try {
      // Retrieve escrow record and validate eligible for release
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        logger.error({ escrowError, escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      if (escrow.status !== EscrowStatus.FUNDED) {
        logger.error({ escrowStatus: escrow.status }, 'Escrow status is not FUNDED');
        throw new ApiError('Escrow status is not FUNDED', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Validate release amount against escrow balance
      if (amount > escrow.amount) {
        logger.error({ releaseAmount: amount, escrowAmount: escrow.amount }, 'Release amount exceeds escrow balance');
        throw new ApiError('Release amount exceeds escrow balance', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Create release record with PENDING status
      const releaseId = uuidv4();
      const { data: release, error: releaseError } = await supabaseAdmin
        .from('releases')
        .insert<Partial<Release>>([{
          id: releaseId,
          escrowId: escrowId,
          amount: amount,
          status: ReleaseStatus.PENDING,
          approvedBy: approvedById,
          metadata: {
            releaseReason: 'Milestone completion',
          },
        }])
        .select()
        .single();

      if (releaseError || !release) {
        logger.error({ releaseError, escrowId }, 'Failed to create release record');
        throw new ApiError('Failed to create release record', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Transfer funds to creator via Stripe Connect
      const partnership = await getPartnershipById(escrow.partnershipId);
      if (!partnership) {
        logger.error({ partnershipId: escrow.partnershipId }, 'Partnership not found');
        throw new ApiError('Partnership not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      if (!partnership.creatorId) {
        logger.error({ partnershipId: escrow.partnershipId }, 'Creator ID not found on partnership');
        throw new ApiError('Creator ID not found on partnership', 500, ErrorCodes.INTERNAL_SERVER_ERROR);
      }

      const { transferId } = await transferToConnectedAccount(
        partnership.creatorId,
        amount,
        escrow.currency,
        `Release from escrow ${escrowId}`,
        { escrowId: escrowId }
      );

      // Update release record status to COMPLETED
      const { data: updatedRelease, error: updateError } = await supabaseAdmin
        .from('releases')
        .update({
          status: ReleaseStatus.COMPLETED,
          stripeTransferId: transferId,
        })
        .eq('id', releaseId)
        .select()
        .single();

      if (updateError || !updatedRelease) {
        logger.error({ updateError, releaseId }, 'Failed to update release status to COMPLETED');
        throw new ApiError('Failed to update release status', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Update escrow record balance and status
      const remainingAmount = escrow.amount - amount;
      const escrowUpdate: Partial<Escrow> = {
        amount: remainingAmount,
        updatedAt: new Date(),
      };

      if (remainingAmount === 0) {
        escrowUpdate.status = EscrowStatus.RELEASED;
      }

      const { data: updatedEscrow, error: escrowUpdateError } = await supabaseAdmin
        .from('escrows')
        .update(escrowUpdate)
        .eq('id', escrowId)
        .select()
        .single();

      if (escrowUpdateError || !updatedEscrow) {
        logger.error({ escrowUpdateError, escrowId }, 'Failed to update escrow record after release');
        throw new ApiError('Failed to update escrow record after release', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Update payment status to RELEASED if fully released
      if (remainingAmount === 0) {
        await updatePaymentStatus(escrow.paymentId, PaymentStatus.RELEASED);
      }

      // Log successful fund release
      logger.info({ escrowId, releaseId, amount }, 'Funds successfully released from escrow');

      // Return release record
      return updatedRelease as Release;
    } catch (error: any) {
      logger.error({ error, escrowId, approvedById, amount }, 'Error releasing funds from escrow');
      throw new ApiError('Error releasing funds from escrow', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Retrieves an escrow record by ID
   * @param escrowId 
   * @returns {Promise<Escrow>} The escrow record with related data
   */
  async getEscrow(escrowId: string): Promise<Escrow> {
    logger.info({ escrowId }, 'Retrieving escrow record by ID');

    try {
      // Query database for escrow record by ID
      const { data, error } = await supabaseAdmin
        .from('escrows')
        .select(`
          *,
          milestones (*),
          releases (*),
          disputes (*)
        `)
        .eq('id', escrowId)
        .single();

      if (error) {
        logger.error({ error, escrowId }, 'Failed to retrieve escrow record');
        throw new ApiError('Failed to retrieve escrow record', 500, ErrorCodes.DATABASE_ERROR);
      }

      if (!data) {
        logger.error({ escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      // Return escrow record with all related data
      return data as Escrow;
    } catch (error: any) {
      logger.error({ error, escrowId }, 'Error retrieving escrow record');
      throw new ApiError('Error retrieving escrow record', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Retrieves an escrow record associated with a payment
   * @param paymentId 
   * @returns {Promise<Escrow>} The escrow record
   */
  async getEscrowByPaymentId(paymentId: string): Promise<Escrow | null> {
    logger.info({ paymentId }, 'Retrieving escrow record by payment ID');

    try {
      // Query database for escrow record by payment ID
      const { data, error } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('paymentId', paymentId)
        .single();

      if (error) {
        logger.error({ error, paymentId }, 'Failed to retrieve escrow record by payment ID');
        return null; // Return null if not found
      }

      // Return escrow record or null if not found
      return data as Escrow;
    } catch (error: any) {
      logger.error({ error, paymentId }, 'Error retrieving escrow record by payment ID');
      throw new ApiError('Error retrieving escrow record by payment ID', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Retrieves all escrow records for a partnership
   * @param partnershipId 
   * @returns {Promise<Escrow[]>} Array of escrow records
   */
  async getEscrowsByPartnership(partnershipId: string): Promise<Escrow[]> {
    logger.info({ partnershipId }, 'Retrieving escrow records by partnership ID');

    try {
      // Query database for escrow records by partnership ID
      const { data, error } = await supabaseAdmin
        .from('escrows')
        .select(`
          *,
          milestones (*),
          releases (*),
          disputes (*)
        `)
        .eq('partnershipId', partnershipId);

      if (error) {
        logger.error({ error, partnershipId }, 'Failed to retrieve escrow records by partnership ID');
        throw new ApiError('Failed to retrieve escrow records', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Return array of escrow records
      return data as Escrow[];
    } catch (error: any) {
      logger.error({ error, partnershipId }, 'Error retrieving escrow records by partnership ID');
      throw new ApiError('Error retrieving escrow records', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Creates a new milestone for an escrow record
   * @param escrowId 
   * @param milestoneData 
   * @returns {Promise<Milestone>} The created milestone
   */
  async createMilestone(escrowId: string, milestoneData: any): Promise<Milestone> {
    logger.info({ escrowId, milestoneData }, 'Creating new milestone for escrow');

    try {
      // Retrieve escrow record and validate status allows milestones
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        logger.error({ escrowError, escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.PENDING) {
        logger.error({ escrowStatus: escrow.status }, 'Escrow status does not allow milestones');
        throw new ApiError('Escrow status does not allow milestones', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Validate milestone amount doesn't exceed escrow balance
      if (milestoneData.amount > escrow.amount) {
        logger.error({ milestoneAmount: milestoneData.amount, escrowAmount: escrow.amount }, 'Milestone amount exceeds escrow balance');
        throw new ApiError('Milestone amount exceeds escrow balance', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Generate milestone ID using uuidv4
      const milestoneId = uuidv4();

      // Create milestone record with PENDING status
      const { data: milestone, error: milestoneError } = await supabaseAdmin
        .from('milestones')
        .insert<Partial<Milestone>>([{
          id: milestoneId,
          escrowId: escrowId,
          title: milestoneData.title,
          description: milestoneData.description,
          amount: milestoneData.amount,
          dueDate: milestoneData.dueDate,
          status: MilestoneStatus.PENDING,
          metadata: milestoneData.metadata,
        }])
        .select()
        .single();

      if (milestoneError || !milestone) {
        logger.error({ milestoneError, escrowId }, 'Failed to create milestone record');
        throw new ApiError('Failed to create milestone record', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Log milestone creation
      logger.info({ milestoneId, escrowId }, 'Milestone record created successfully');

      // Return created milestone
      return milestone as Milestone;
    } catch (error: any) {
      logger.error({ error, escrowId, milestoneData }, 'Error creating milestone for escrow');
      throw new ApiError('Error creating milestone for escrow', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Marks a milestone as completed and optionally releases associated funds
   * @param milestoneId 
   * @param approvedById 
   * @param releasePayment 
   * @returns {Promise<Milestone>} The updated milestone
   */
  async completeMilestone(milestoneId: string, approvedById: string, releasePayment: boolean): Promise<Milestone> {
    logger.info({ milestoneId, approvedById, releasePayment }, 'Completing milestone');

    try {
      // Retrieve milestone and validate it exists
      const { data: milestone, error: milestoneError } = await supabaseAdmin
        .from('milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

      if (milestoneError || !milestone) {
        logger.error({ milestoneError, milestoneId }, 'Milestone record not found');
        throw new ApiError('Milestone record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      // Verify milestone status is PENDING
      if (milestone.status !== MilestoneStatus.PENDING) {
        logger.error({ milestoneStatus: milestone.status }, 'Milestone status is not PENDING');
        throw new ApiError('Milestone status is not PENDING', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Update milestone status to COMPLETED
      const { data: updatedMilestone, error: updateError } = await supabaseAdmin
        .from('milestones')
        .update({
          status: MilestoneStatus.COMPLETED,
          completedAt: new Date(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (updateError || !updatedMilestone) {
        logger.error({ updateError, milestoneId }, 'Failed to update milestone status to COMPLETED');
        throw new ApiError('Failed to update milestone status', 500, ErrorCodes.DATABASE_ERROR);
      }

      // If releasePayment is true, initiate fund release for milestone amount
      if (releasePayment) {
        await this.releaseFunds(milestone.escrowId, approvedById, milestone.amount);
      }

      // Log milestone completion
      logger.info({ milestoneId }, 'Milestone completed successfully');

      // Return updated milestone
      return updatedMilestone as Milestone;
    } catch (error: any) {
      logger.error({ error, milestoneId, approvedById, releasePayment }, 'Error completing milestone');
      throw new ApiError('Error completing milestone', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Initiates a dispute for an escrow transaction
   * @param escrowId 
   * @param raisedById 
   * @param reason 
   * @param evidence 
   * @returns {Promise<Dispute>} The created dispute
   */
  async initiateDispute(escrowId: string, raisedById: string, reason: string, evidence: any): Promise<Dispute> {
    logger.info({ escrowId, raisedById, reason }, 'Initiating dispute for escrow');

    try {
      // Retrieve escrow record and validate eligible for dispute
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        logger.error({ escrowError, escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.PENDING) {
        logger.error({ escrowStatus: escrow.status }, 'Escrow status does not allow disputes');
        throw new ApiError('Escrow status does not allow disputes', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Generate dispute ID using uuidv4
      const disputeId = uuidv4();

      // Create dispute record with OPEN status
      const { data: dispute, error: disputeError } = await supabaseAdmin
        .from('disputes')
        .insert<Partial<Dispute>>([{
          id: disputeId,
          escrowId: escrowId,
          raisedBy: raisedById,
          reason: reason,
          status: DisputeStatus.OPEN,
          metadata: {
            evidence: evidence,
          },
        }])
        .select()
        .single();

      if (disputeError || !dispute) {
        logger.error({ disputeError, escrowId }, 'Failed to create dispute record');
        throw new ApiError('Failed to create dispute record', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Update escrow status to DISPUTED
      await supabaseAdmin
        .from('escrows')
        .update({
          status: EscrowStatus.DISPUTED,
        })
        .eq('id', escrowId);

      // Log dispute initiation
      logger.info({ disputeId, escrowId }, 'Dispute initiated successfully');

      // Return created dispute
      return dispute as Dispute;
    } catch (error: any) {
      logger.error({ error, escrowId, raisedById, reason }, 'Error initiating dispute for escrow');
      throw new ApiError('Error initiating dispute for escrow', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Resolves an existing dispute with specified resolution
   * @param disputeId 
   * @param resolution 
   * @param resolvedById 
   * @returns {Promise<Dispute>} The updated dispute
   */
  async resolveDispute(disputeId: string, resolution: any, resolvedById: string): Promise<Dispute> {
    logger.info({ disputeId, resolvedById, resolution }, 'Resolving dispute');

    try {
      // Retrieve dispute record and associated escrow
      const { data: dispute, error: disputeError } = await supabaseAdmin
        .from('disputes')
        .select('*, escrows (*)')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        logger.error({ disputeError, disputeId }, 'Dispute record not found');
        throw new ApiError('Dispute record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      // Validate dispute status is OPEN
      if (dispute.status !== DisputeStatus.OPEN) {
        logger.error({ disputeStatus: dispute.status }, 'Dispute status is not OPEN');
        throw new ApiError('Dispute status is not OPEN', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Update dispute with resolution details and RESOLVED status
      const { data: updatedDispute, error: updateError } = await supabaseAdmin
        .from('disputes')
        .update({
          status: DisputeStatus.RESOLVED,
          resolvedBy: resolvedById,
          resolutionDetails: resolution,
        })
        .eq('id', disputeId)
        .select()
        .single();

      if (updateError || !updatedDispute) {
        logger.error({ updateError, disputeId }, 'Failed to update dispute record with resolution');
        throw new ApiError('Failed to update dispute record with resolution', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Apply resolution - release funds, refund, or split based on resolution type
      // This is a placeholder - implement actual resolution logic based on resolution type
      logger.info({ disputeId, resolutionType: resolution.type }, 'Applying dispute resolution');

      // Update escrow status based on resolution outcome
      await supabaseAdmin
        .from('escrows')
        .update({
          status: EscrowStatus.RELEASED, // Placeholder - update based on resolution
        })
        .eq('id', dispute.escrowId);

      // Log dispute resolution
      logger.info({ disputeId }, 'Dispute resolved successfully');

      // Return updated dispute with resolution details
      return updatedDispute as Dispute;
    } catch (error: any) {
      logger.error({ error, disputeId, resolution, resolvedById }, 'Error resolving dispute');
      throw new ApiError('Error resolving dispute', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Checks for escrow records that have reached timeout and should be automatically released
   * @returns {Promise<number>} Number of auto-released escrow records
   */
  async checkTimeoutReleases(): Promise<number> {
    logger.info('Checking for escrow records eligible for auto-release');

    try {
      // Query for escrow records past their auto-release date with FUNDED status
      const { data: escrows, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('status', EscrowStatus.FUNDED)
        .lte('autoReleaseAt', new Date().toISOString());

      if (escrowError) {
        logger.error({ escrowError }, 'Failed to retrieve escrow records for auto-release');
        throw new ApiError('Failed to retrieve escrow records for auto-release', 500, ErrorCodes.DATABASE_ERROR);
      }

      let releasedCount = 0;

      // Process automatic releases for each eligible record
      for (const escrow of escrows) {
        try {
          // Implement automatic release logic here
          logger.info({ escrowId: escrow.id }, 'Automatically releasing escrow due to timeout');
          // Placeholder - implement actual release logic
          releasedCount++;
        } catch (releaseError: any) {
          logger.error({ releaseError, escrowId: escrow.id }, 'Failed to auto-release escrow');
          // Handle individual release failures - log, retry, or escalate
        }
      }

      // Log completed auto-releases with count
      logger.info({ releasedCount }, 'Completed auto-release check');

      // Return count of auto-released records
      return releasedCount;
    } catch (error: any) {
      logger.error({ error }, 'Error checking for timeout releases');
      throw new ApiError('Error checking for timeout releases', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Retrieves statistics about escrow usage and performance
   * @param filters 
   * @returns {Promise<object>} Escrow statistics including volume, counts by status
   */
  async getEscrowStatistics(filters: any): Promise<object> {
    logger.info({ filters }, 'Retrieving escrow statistics');

    try {
      // Query database for escrow records matching filters
      // Placeholder - implement actual query with filters
      const escrowRecords = await supabaseAdmin
        .from('escrows')
        .select('*');

      // Calculate total escrowed amount, average duration
      const totalEscrowed = escrowRecords.data?.reduce((sum, escrow) => sum + escrow.amount, 0) || 0;
      const averageDuration = 0; // Placeholder - implement duration calculation

      // Count records by status (funded, released, disputed)
      const statusCounts = {
        funded: escrowRecords.data?.filter(escrow => escrow.status === EscrowStatus.FUNDED).length || 0,
        released: escrowRecords.data?.filter(escrow => escrow.status === EscrowStatus.RELEASED).length || 0,
        disputed: escrowRecords.data?.filter(escrow => escrow.status === EscrowStatus.DISPUTED).length || 0,
      };

      // Calculate dispute ratio and average resolution time
      const disputeRatio = statusCounts.disputed / escrowRecords.data?.length || 0;
      const averageResolutionTime = 0; // Placeholder - implement resolution time calculation

      // Return compiled statistics
      return {
        totalEscrowed,
        averageDuration,
        statusCounts,
        disputeRatio,
        averageResolutionTime,
      };
    } catch (error: any) {
      logger.error({ error, filters }, 'Error retrieving escrow statistics');
      throw new ApiError('Error retrieving escrow statistics', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }

  /**
   * Cancels an escrow and initiates refund process
   * @param escrowId 
   * @param reason 
   * @param cancelledById 
   * @returns {Promise<Escrow>} The updated escrow record
   */
  async cancelEscrow(escrowId: string, reason: string, cancelledById: string): Promise<Escrow> {
    logger.info({ escrowId, reason, cancelledById }, 'Cancelling escrow');

    try {
      // Retrieve escrow record and validate eligible for cancellation
      const { data: escrow, error: escrowError } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError || !escrow) {
        logger.error({ escrowError, escrowId }, 'Escrow record not found');
        throw new ApiError('Escrow record not found', 404, ErrorCodes.RESOURCE_NOT_FOUND);
      }

      if (escrow.status === EscrowStatus.RELEASED || escrow.status === EscrowStatus.CANCELLED) {
        logger.error({ escrowStatus: escrow.status }, 'Escrow cannot be cancelled in its current status');
        throw new ApiError('Escrow cannot be cancelled in its current status', 400, ErrorCodes.VALIDATION_ERROR);
      }

      // Update escrow status to CANCELLED
      const { data: updatedEscrow, error: updateError } = await supabaseAdmin
        .from('escrows')
        .update({
          status: EscrowStatus.CANCELLED,
          metadata: {
            cancellationReason: reason,
            cancelledBy: cancelledById,
          },
        })
        .eq('id', escrowId)
        .select()
        .single();

      if (updateError || !updatedEscrow) {
        logger.error({ updateError, escrowId }, 'Failed to update escrow status to CANCELLED');
        throw new ApiError('Failed to update escrow status', 500, ErrorCodes.DATABASE_ERROR);
      }

      // Initiate refund process if funds were already held
      if (escrow.status === EscrowStatus.FUNDED) {
        // Placeholder - implement actual refund logic
        logger.info({ escrowId }, 'Initiating refund process for cancelled escrow');
      }

      // Log escrow cancellation
      logger.info({ escrowId }, 'Escrow cancelled successfully');

      // Return updated escrow record
      return updatedEscrow as Escrow;
    } catch (error: any) {
      logger.error({ error, escrowId, reason, cancelledById }, 'Error cancelling escrow');
      throw new ApiError('Error cancelling escrow', 500, ErrorCodes.INTERNAL_SERVER_ERROR, {
        message: error.message,
      });
    }
  }
}

// Create a singleton instance of the EscrowService
const escrowService = new EscrowService();

// Export the EscrowService instance
export { escrowService };