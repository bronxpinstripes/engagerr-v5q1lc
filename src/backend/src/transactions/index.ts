/**
 * Entry point for the transactions module that consolidates and exports all transaction-related
 * functionality including payments, escrow, contracts, and financial reconciliation for the Engagerr platform.
 */

import * as escrow from './escrow';
import * as contracts from './contracts';
import * as payments from './payments';
import * as reconciliation from './reconciliation';
import { logger } from '../utils/logger';

/**
 * Service that provides a unified interface to all transaction-related functionality
 */
export class TransactionService {
  /**
   * Initializes the transaction service with required dependencies
   */
  constructor() {
    // Initialize escrow service from the escrow module
    this.escrowService = escrow.escrowService;
    // Initialize reconciliation service from the reconciliation module
    this.reconciliationService = new reconciliation.ReconciliationService();
    // Log transaction service initialization
    logger.info('TransactionService initialized');
  }

  /**
   * Property to hold the escrow service instance
   */
  public escrowService: escrow.EscrowService;

  /**
   * Property to hold the reconciliation service instance
   */
  public reconciliationService: reconciliation.ReconciliationService;

  /**
   * Processes a payment for a partnership with proper escrow handling
   * @param paymentData 
   * @returns {Promise<object>} Payment processing result with client secret
   */
  async processPartnershipPayment(paymentData: any): Promise<object> {
    logger.info({ paymentData }, 'Processing partnership payment');

    // Create a partnership payment using payments.createPartnershipPayment
    const payment = await payments.createPartnershipPayment(paymentData);

    // Create a payment intent for the payment
    const paymentIntent = await payments.createPaymentIntent({
      ...paymentData,
      amount: paymentData.amount, // Ensure amount is passed correctly
      currency: paymentData.currency, // Ensure currency is passed correctly
    });

    // Set up escrow configuration based on partnership terms
    const escrowConfig = {
      paymentId: payment.id,
      amount: paymentData.amount, // Ensure amount is passed correctly
    };

    // Return payment intent details for frontend processing
    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.clientSecret,
      escrowConfig: escrowConfig,
    };
  }

  /**
   * Completes a partnership transaction from payment to contract creation
   * @param partnershipId 
   * @param transactionData 
   * @returns {Promise<object>} Transaction result with payment and contract details
   */
  async completePartnershipTransaction(partnershipId: string, transactionData: any): Promise<object> {
    logger.info({ partnershipId, transactionData }, 'Completing partnership transaction');

    // Verify the partnership exists
    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId },
    });

    if (!partnership) {
      logger.error({ partnershipId }, 'Partnership not found');
      throw new ApiError('Partnership not found', 404, 'PARTNERSHIP_NOT_FOUND');
    }

    // Create payment record for the partnership
    const payment = await payments.createPartnershipPayment(transactionData);

    // Generate contract for the partnership using contracts.generateContract
    const contractData = {
      partnershipId: partnershipId,
      terms: transactionData.terms,
    };
    const contract = await contracts.generateContract(contractData);

    // Set up appropriate escrow configuration
    const escrowConfig = {
      paymentId: payment.id,
      amount: transactionData.amount, // Ensure amount is passed correctly
    };

    // Return comprehensive transaction details including payment and contract IDs
    return {
      paymentId: payment.id,
      contractId: contract.id,
      escrowConfig: escrowConfig,
    };
  }

  /**
   * Releases payment from escrow to creator after deliverables approval
   * @param paymentId 
   * @param approvedById 
   * @returns {Promise<object>} Payment release result
   */
  async releasePartnershipPayment(paymentId: string, approvedById: string): Promise<object> {
    logger.info({ paymentId, approvedById }, 'Releasing partnership payment from escrow');

    // Transfer payment to creator using payments.transferPaymentToCreator
    const transferResult = await payments.transferPaymentToCreator(paymentId, approvedById);

    // Update contract status if all payments have been released
    const payment = await payments.getPaymentById(paymentId);
    if (!payment) {
      logger.error({ paymentId }, 'Payment not found');
      throw new ApiError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    const partnershipId = payment.partnershipId;
    const partnershipPayments = await payments.getPaymentsByPartnershipId(partnershipId);

    const allPaymentsReleased = partnershipPayments.every(p => p.status === PaymentStatus.RELEASED);

    if (allPaymentsReleased) {
      await contracts.updateContractStatus(payment.partnershipId, contracts.ContractStatus.COMPLETED);
    }

    // Record payment release in transaction history
    // (Implementation depends on how transaction history is stored)

    // Return release confirmation details
    return {
      paymentId: paymentId,
      transferResult: transferResult,
      contractUpdated: allPaymentsReleased,
    };
  }

  /**
   * Generates a financial report for a specific time period
   * @param startDate 
   * @param endDate 
   * @param reportType 
   * @returns {Promise<object>} Transaction report data
   */
  async generateTransactionReport(startDate: Date, endDate: Date, reportType: string): Promise<object> {
    logger.info({ startDate, endDate, reportType }, 'Generating transaction report');

    // Reconcile payments for the specified period
    const reconciliationResult = await reconciliation.reconcilePayments(startDate, endDate);

    // Generate appropriate report format based on reportType
    let reportData: any;
    if (reportType === 'detailed') {
      reportData = reconciliationResult;
    } else if (reportType === 'summary') {
      reportData = {
        totalTransactions: reconciliationResult.totalTransactions,
        totalAmount: reconciliationResult.totalAmount,
        totalPlatformFees: reconciliationResult.totalPlatformFees,
        discrepancies: reconciliationResult.discrepancies.length,
      };
    } else {
      logger.warn({ reportType }, 'Unsupported report type requested');
      throw new ApiError('Unsupported report type', 400, 'INVALID_REPORT_TYPE');
    }

    // Include platform revenue, transaction volume, and fee breakdowns
    const revenueData = await reconciliation.calculatePlatformRevenue(startDate, endDate);
    reportData.revenue = revenueData;

    // Return comprehensive report object
    return reportData;
  }
}

// Create a singleton instance of the TransactionService
const transactionService = new TransactionService();

// Export the TransactionService instance
export { transactionService };

// Export all members from escrow namespace
export { escrow };

// Export all members from contracts namespace
export { contracts };

// Export all members from payments namespace
export { payments };

// Export all members from reconciliation namespace
export { reconciliation };