/**
 * Reconciliation service for financial transactions
 * 
 * Provides functionality for reconciling payments between platform, creators, and brands,
 * ensuring accurate accounting and identifying discrepancies for resolution.
 */

import { Payment } from '../types/payment';
import { TransactionError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { stripePayment } from '../integrations/stripe/payment';
import { PaymentModel } from '../models/payment';
import Decimal from 'decimal.js';

// Set Decimal precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Represents a discrepancy found during payment reconciliation
 */
interface PaymentDiscrepancy {
  paymentId: string;
  type: 'AMOUNT_MISMATCH' | 'MISSING_INTERNAL' | 'MISSING_STRIPE' | 'STATUS_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: {
    internalData?: Partial<Payment>;
    stripeData?: any;
    difference?: number;
    expectedValue?: any;
    actualValue?: any;
  };
  detectedAt: Date;
  resolved: boolean;
  resolutionDetails?: {
    resolvedAt: Date;
    resolutionMethod: string;
    notes: string;
  };
}

/**
 * Result of a discrepancy resolution attempt
 */
interface DiscrepancyResolutionResult {
  discrepancy: PaymentDiscrepancy;
  resolved: boolean;
  action: string;
  notes: string;
  needsManualReview: boolean;
}

/**
 * Summary report of reconciliation results
 */
interface ReconciliationReport {
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  totalTransactions: number;
  totalAmount: number;
  totalPlatformFees: number;
  discrepancies: PaymentDiscrepancy[];
  unresolvedDiscrepancies: number;
  resolvedDiscrepancies: number;
  resolution: {
    automaticallyResolved: number;
    manualReviewRequired: number;
  };
  summary: string;
}

/**
 * Results of reconciling payments for a specific partnership
 */
interface PartnershipReconciliationResult {
  partnershipId: string;
  totalPayments: number;
  totalAmount: number;
  expectedAmount: number;
  difference: number;
  discrepancies: PaymentDiscrepancy[];
  missingPayments: boolean;
  complete: boolean;
}

/**
 * Report of platform revenue broken down by fee types
 */
interface RevenueReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  total: number;
  breakdown: {
    partnershipFees: number;
    subscriptionRevenue: number;
    additionalServiceFees: number;
  };
  transactionCount: number;
  averageFee: number;
}

/**
 * Format options for reconciliation reports
 */
enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf'
}

/**
 * Monthly reconciliation report for accounting
 */
interface MonthlyReconciliationReport extends ReconciliationReport {
  month: number;
  year: number;
  revenueData: RevenueReport;
  transactionSummary: {
    subscriptions: {
      count: number;
      amount: number;
    };
    marketplaceTransactions: {
      count: number;
      amount: number;
      fees: number;
    };
    refunds: {
      count: number;
      amount: number;
    };
  };
}

/**
 * Detailed audit results for a transaction
 */
interface TransactionAuditResult {
  transactionId: string;
  paymentId: string;
  partnershipId: string;
  auditPassed: boolean;
  issues: {
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    data: any;
  }[];
  platformFeeAccuracy: boolean;
  internalRecordMatch: boolean;
  stripeRecordMatch: boolean;
  auditTrail: {
    timestamp: Date;
    action: string;
    actor?: string;
    details: any;
  }[];
}

/**
 * Reconciles all pending payments for a given time period
 * 
 * @param startDate The start date for the reconciliation period
 * @param endDate The end date for the reconciliation period
 * @returns A report containing reconciliation results
 */
export async function reconcilePayments(
  startDate: Date,
  endDate: Date
): Promise<ReconciliationReport> {
  logger.info({ startDate, endDate }, 'Starting payment reconciliation process');
  
  try {
    // Initialize report structure
    const report: ReconciliationReport = {
      startDate,
      endDate,
      generatedAt: new Date(),
      totalTransactions: 0,
      totalAmount: 0,
      totalPlatformFees: 0,
      discrepancies: [],
      unresolvedDiscrepancies: 0,
      resolvedDiscrepancies: 0,
      resolution: {
        automaticallyResolved: 0,
        manualReviewRequired: 0
      },
      summary: ''
    };
    
    // Retrieve all payments within the date range
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        partnership: true
      }
    });
    
    report.totalTransactions = payments.length;
    
    // Process each payment for reconciliation
    for (const payment of payments) {
      // Add to totals
      report.totalAmount += Number(payment.amount);
      report.totalPlatformFees += Number(payment.platformFee);
      
      // Skip payments without Stripe payment intent IDs
      if (!payment.stripePaymentIntentId) {
        continue;
      }
      
      try {
        // Get corresponding Stripe payment data
        const stripeData = await stripePayment.getPaymentDetails(payment.stripePaymentIntentId);
        
        // Compare internal records with Stripe data
        const discrepancies = comparePaymentRecords(payment, stripeData);
        
        if (discrepancies.length > 0) {
          // Add discrepancies to the report
          report.discrepancies.push(...discrepancies);
          
          // Log each discrepancy
          discrepancies.forEach(discrepancy => {
            logger.warn({ discrepancy }, `Payment discrepancy detected: ${discrepancy.type}`);
          });
          
          // Attempt to resolve discrepancies
          for (const discrepancy of discrepancies) {
            const resolutionResult = await resolveDiscrepancy(discrepancy);
            
            if (resolutionResult.resolved) {
              report.resolvedDiscrepancies++;
              report.resolution.automaticallyResolved++;
            } else if (resolutionResult.needsManualReview) {
              report.unresolvedDiscrepancies++;
              report.resolution.manualReviewRequired++;
            }
          }
        }
      } catch (error) {
        logger.error({ error, paymentId: payment.id }, 'Error reconciling payment');
        
        // Add as unresolved discrepancy
        const errorDiscrepancy: PaymentDiscrepancy = {
          paymentId: payment.id,
          type: 'STATUS_MISMATCH',
          severity: 'HIGH',
          details: {
            internalData: payment,
            error: error instanceof Error ? error.message : String(error)
          },
          detectedAt: new Date(),
          resolved: false
        };
        
        report.discrepancies.push(errorDiscrepancy);
        report.unresolvedDiscrepancies++;
        report.resolution.manualReviewRequired++;
      }
    }
    
    // Generate summary
    report.summary = generateReconciliationSummary(report);
    
    logger.info({
      totalTransactions: report.totalTransactions,
      discrepancies: report.discrepancies.length,
      resolved: report.resolvedDiscrepancies,
      unresolved: report.unresolvedDiscrepancies
    }, 'Payment reconciliation completed');
    
    return report;
  } catch (error) {
    logger.error({ error, startDate, endDate }, 'Failed to reconcile payments');
    throw new TransactionError(
      `Failed to reconcile payments for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
      { cause: error }
    );
  }
}

/**
 * Compares internal payment records with Stripe data to identify discrepancies
 */
function comparePaymentRecords(internalPayment: Payment, stripeData: any): PaymentDiscrepancy[] {
  const discrepancies: PaymentDiscrepancy[] = [];
  
  // Convert amounts to Decimal for precise comparison
  const internalAmount = new Decimal(internalPayment.amount);
  const stripeAmount = new Decimal(stripeData.amount / 100); // Convert from cents
  
  // Check for amount mismatch
  if (!internalAmount.equals(stripeAmount)) {
    discrepancies.push({
      paymentId: internalPayment.id,
      type: 'AMOUNT_MISMATCH',
      severity: calculateDiscrepancySeverity(internalAmount, stripeAmount),
      details: {
        internalData: { amount: internalPayment.amount },
        stripeData: { amount: stripeData.amount / 100 },
        difference: internalAmount.minus(stripeAmount).toNumber(),
        expectedValue: internalAmount.toNumber(),
        actualValue: stripeAmount.toNumber()
      },
      detectedAt: new Date(),
      resolved: false
    });
  }
  
  // Check for status mismatch
  const internalStatus = internalPayment.status;
  const stripeStatus = mapStripeStatusToInternal(stripeData.status);
  
  if (internalStatus !== stripeStatus) {
    discrepancies.push({
      paymentId: internalPayment.id,
      type: 'STATUS_MISMATCH',
      severity: 'MEDIUM',
      details: {
        internalData: { status: internalStatus },
        stripeData: { status: stripeData.status },
        expectedValue: internalStatus,
        actualValue: stripeData.status
      },
      detectedAt: new Date(),
      resolved: false
    });
  }
  
  return discrepancies;
}

/**
 * Maps Stripe payment status to internal payment status
 */
function mapStripeStatusToInternal(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'succeeded':
      return 'COMPLETED';
    case 'processing':
      return 'PROCESSING';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'PENDING';
    case 'canceled':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

/**
 * Calculates severity of a payment amount discrepancy
 */
function calculateDiscrepancySeverity(expected: Decimal, actual: Decimal): 'LOW' | 'MEDIUM' | 'HIGH' {
  const difference = expected.minus(actual).abs();
  const percentageDifference = difference.div(expected).times(100);
  
  if (percentageDifference.greaterThan(10)) {
    return 'HIGH';
  } else if (percentageDifference.greaterThan(1)) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Generates a summary string based on reconciliation results
 */
function generateReconciliationSummary(report: ReconciliationReport): string {
  return `Reconciliation for period ${report.startDate.toLocaleDateString()} to ${report.endDate.toLocaleDateString()}: 
Processed ${report.totalTransactions} transactions totaling $${report.totalAmount.toFixed(2)}.
Platform fees collected: $${report.totalPlatformFees.toFixed(2)}.
Found ${report.discrepancies.length} discrepancies, ${report.resolvedDiscrepancies} resolved automatically, 
${report.unresolvedDiscrepancies} requiring manual review.`;
}

/**
 * Reconciles payments for a specific partnership
 * 
 * @param partnershipId ID of the partnership to reconcile
 * @returns Results of the partnership payment reconciliation
 */
export async function reconcilePartnershipPayments(
  partnershipId: string
): Promise<PartnershipReconciliationResult> {
  logger.info({ partnershipId }, 'Starting partnership payment reconciliation');
  
  try {
    // Initialize result structure
    const result: PartnershipReconciliationResult = {
      partnershipId,
      totalPayments: 0,
      totalAmount: 0,
      expectedAmount: 0,
      difference: 0,
      discrepancies: [],
      missingPayments: false,
      complete: false
    };
    
    // Retrieve the partnership record
    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId },
      include: {
        contract: true,
        payments: true
      }
    });
    
    if (!partnership) {
      throw new TransactionError(`Partnership not found: ${partnershipId}`);
    }
    
    // Calculate expected total based on contract
    result.expectedAmount = Number(partnership.budget);
    
    // Process payments
    const payments = partnership.payments;
    result.totalPayments = payments.length;
    
    // Calculate total amount from payments
    let totalPaid = new Decimal(0);
    for (const payment of payments) {
      totalPaid = totalPaid.plus(payment.amount);
      
      // Check payment status in Stripe if we have a payment intent ID
      if (payment.stripePaymentIntentId) {
        try {
          const stripeData = await stripePayment.getPaymentDetails(payment.stripePaymentIntentId);
          
          // Compare internal records with Stripe data
          const discrepancies = comparePaymentRecords(payment, stripeData);
          if (discrepancies.length > 0) {
            result.discrepancies.push(...discrepancies);
          }
        } catch (error) {
          logger.error({ error, paymentId: payment.id }, 'Error checking payment in Stripe');
          
          // Add as discrepancy
          result.discrepancies.push({
            paymentId: payment.id,
            type: 'STATUS_MISMATCH',
            severity: 'HIGH',
            details: {
              internalData: payment,
              error: error instanceof Error ? error.message : String(error)
            },
            detectedAt: new Date(),
            resolved: false
          });
        }
      }
    }
    
    result.totalAmount = totalPaid.toNumber();
    
    // Calculate difference between expected and actual
    result.difference = result.expectedAmount - result.totalAmount;
    
    // Determine if payments are missing
    result.missingPayments = result.difference > 0;
    
    // Determine if reconciliation is complete
    result.complete = (result.difference === 0) && (result.discrepancies.length === 0);
    
    logger.info({
      partnershipId,
      totalPayments: result.totalPayments,
      expectedAmount: result.expectedAmount,
      actualAmount: result.totalAmount,
      difference: result.difference,
      discrepancies: result.discrepancies.length,
      complete: result.complete
    }, 'Partnership payment reconciliation completed');
    
    return result;
  } catch (error) {
    logger.error({ error, partnershipId }, 'Failed to reconcile partnership payments');
    throw new TransactionError(
      `Failed to reconcile payments for partnership ${partnershipId}`,
      { cause: error }
    );
  }
}

/**
 * Generates a detailed reconciliation report for accounting and audit purposes
 * 
 * @param startDate Start date for the reporting period
 * @param endDate End date for the reporting period
 * @param format Format of the report
 * @returns Formatted reconciliation report
 */
export async function generateReconciliationReport(
  startDate: Date,
  endDate: Date,
  format: ReportFormat = ReportFormat.JSON
): Promise<ReconciliationReport> {
  logger.info({ startDate, endDate, format }, 'Generating reconciliation report');
  
  try {
    // Perform reconciliation for the period
    const reconciliationResults = await reconcilePayments(startDate, endDate);
    
    // Calculate platform revenue
    const revenueReport = await calculatePlatformRevenue(startDate, endDate);
    
    // Enhance the report with additional data
    const enhancedReport = {
      ...reconciliationResults,
      revenue: revenueReport,
      format
    };
    
    // Save the report to the database for audit purposes
    await prisma.reconciliationReport.create({
      data: {
        startDate,
        endDate,
        generatedAt: new Date(),
        totalTransactions: reconciliationResults.totalTransactions,
        totalAmount: reconciliationResults.totalAmount,
        totalPlatformFees: reconciliationResults.totalPlatformFees,
        unresolvedDiscrepancies: reconciliationResults.unresolvedDiscrepancies,
        resolvedDiscrepancies: reconciliationResults.resolvedDiscrepancies,
        format: format.toString(),
        reportData: enhancedReport
      }
    });
    
    logger.info({
      startDate,
      endDate,
      format,
      totalTransactions: reconciliationResults.totalTransactions
    }, 'Reconciliation report generated successfully');
    
    return enhancedReport;
  } catch (error) {
    logger.error({ error, startDate, endDate, format }, 'Failed to generate reconciliation report');
    throw new TransactionError(
      `Failed to generate reconciliation report for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
      { cause: error }
    );
  }
}

/**
 * Attempts to resolve a payment discrepancy automatically or flags it for manual review
 * 
 * @param discrepancy The discrepancy to resolve
 * @returns The result of the resolution attempt
 */
export async function resolveDiscrepancy(
  discrepancy: PaymentDiscrepancy
): Promise<DiscrepancyResolutionResult> {
  logger.info({ discrepancy }, 'Attempting to resolve payment discrepancy');
  
  try {
    const result: DiscrepancyResolutionResult = {
      discrepancy,
      resolved: false,
      action: '',
      notes: '',
      needsManualReview: false
    };
    
    // Different resolution strategies based on discrepancy type
    switch (discrepancy.type) {
      case 'AMOUNT_MISMATCH':
        return await resolveAmountMismatch(discrepancy);
        
      case 'STATUS_MISMATCH':
        return await resolveStatusMismatch(discrepancy);
        
      case 'MISSING_INTERNAL':
        return await resolveMissingInternal(discrepancy);
        
      case 'MISSING_STRIPE':
        return await resolveMissingStripe(discrepancy);
        
      default:
        // Unknown discrepancy type, flag for manual review
        result.action = 'FLAGGED_FOR_REVIEW';
        result.notes = `Unknown discrepancy type: ${discrepancy.type}`;
        result.needsManualReview = true;
        return result;
    }
  } catch (error) {
    logger.error({ error, discrepancy }, 'Error resolving payment discrepancy');
    
    // Return result with error information
    return {
      discrepancy,
      resolved: false,
      action: 'ERROR',
      notes: `Error during resolution: ${error instanceof Error ? error.message : String(error)}`,
      needsManualReview: true
    };
  }
}

/**
 * Resolves an amount mismatch discrepancy
 */
async function resolveAmountMismatch(
  discrepancy: PaymentDiscrepancy
): Promise<DiscrepancyResolutionResult> {
  const result: DiscrepancyResolutionResult = {
    discrepancy,
    resolved: false,
    action: '',
    notes: '',
    needsManualReview: false
  };
  
  // Get the payment record
  const payment = await prisma.payment.findUnique({
    where: { id: discrepancy.paymentId }
  });
  
  if (!payment) {
    result.action = 'ERROR';
    result.notes = 'Payment record not found';
    result.needsManualReview = true;
    return result;
  }
  
  // Calculate the difference amount
  const difference = discrepancy.details.difference || 0;
  const absDifference = Math.abs(difference);
  
  // For very small differences (e.g., due to rounding), automatically resolve
  if (absDifference < 0.01) {
    // Update the payment record to match Stripe (source of truth for amounts)
    await prisma.payment.update({
      where: { id: discrepancy.paymentId },
      data: {
        amount: discrepancy.details.actualValue,
        metadata: {
          ...payment.metadata,
          reconciliation: {
            action: 'AMOUNT_ADJUSTED',
            previousAmount: payment.amount,
            adjustedAmount: discrepancy.details.actualValue,
            difference: difference,
            reason: 'Automatic reconciliation - rounding difference',
            timestamp: new Date().toISOString()
          }
        }
      }
    });
    
    // Mark the discrepancy as resolved
    discrepancy.resolved = true;
    discrepancy.resolutionDetails = {
      resolvedAt: new Date(),
      resolutionMethod: 'AUTOMATIC',
      notes: 'Minor amount difference automatically adjusted'
    };
    
    result.resolved = true;
    result.action = 'AMOUNT_ADJUSTED';
    result.notes = 'Minor amount difference automatically resolved';
    
    logger.info({
      paymentId: discrepancy.paymentId,
      difference
    }, 'Automatically resolved minor amount discrepancy');
    
    return result;
  }
  
  // For larger differences, flag for manual review
  result.action = 'FLAGGED_FOR_REVIEW';
  result.notes = `Amount difference of ${difference.toFixed(2)} requires manual review`;
  result.needsManualReview = true;
  
  // Log the discrepancy for manual handling
  logger.warn({
    paymentId: discrepancy.paymentId,
    difference,
    internalAmount: discrepancy.details.expectedValue,
    stripeAmount: discrepancy.details.actualValue
  }, 'Payment amount discrepancy flagged for manual review');
  
  return result;
}

/**
 * Resolves a status mismatch discrepancy
 */
async function resolveStatusMismatch(
  discrepancy: PaymentDiscrepancy
): Promise<DiscrepancyResolutionResult> {
  const result: DiscrepancyResolutionResult = {
    discrepancy,
    resolved: false,
    action: '',
    notes: '',
    needsManualReview: false
  };
  
  // Get the payment record
  const payment = await prisma.payment.findUnique({
    where: { id: discrepancy.paymentId }
  });
  
  if (!payment) {
    result.action = 'ERROR';
    result.notes = 'Payment record not found';
    result.needsManualReview = true;
    return result;
  }
  
  // Get the current Stripe status
  let stripeData;
  try {
    stripeData = await stripePayment.getPaymentDetails(payment.stripePaymentIntentId);
  } catch (error) {
    result.action = 'ERROR';
    result.notes = `Failed to get Stripe payment data: ${error instanceof Error ? error.message : String(error)}`;
    result.needsManualReview = true;
    return result;
  }
  
  const stripeStatus = mapStripeStatusToInternal(stripeData.status);
  
  // If the Stripe status is more definitive (completed or failed),
  // update our internal status to match
  if (
    (stripeStatus === 'COMPLETED' && payment.status !== 'COMPLETED') ||
    (stripeStatus === 'CANCELLED' && payment.status !== 'CANCELLED')
  ) {
    // Update the internal payment status
    await prisma.payment.update({
      where: { id: discrepancy.paymentId },
      data: {
        status: stripeStatus,
        metadata: {
          ...payment.metadata,
          reconciliation: {
            action: 'STATUS_UPDATED',
            previousStatus: payment.status,
            newStatus: stripeStatus,
            reason: 'Automatic reconciliation - Stripe status sync',
            timestamp: new Date().toISOString()
          }
        }
      }
    });
    
    // Mark the discrepancy as resolved
    discrepancy.resolved = true;
    discrepancy.resolutionDetails = {
      resolvedAt: new Date(),
      resolutionMethod: 'AUTOMATIC',
      notes: `Payment status updated from ${payment.status} to ${stripeStatus} based on Stripe data`
    };
    
    result.resolved = true;
    result.action = 'STATUS_UPDATED';
    result.notes = `Payment status synchronized with Stripe: ${stripeStatus}`;
    
    logger.info({
      paymentId: discrepancy.paymentId,
      oldStatus: payment.status,
      newStatus: stripeStatus
    }, 'Automatically resolved payment status discrepancy');
    
    return result;
  }
  
  // Flag other status discrepancies for manual review
  result.action = 'FLAGGED_FOR_REVIEW';
  result.notes = `Status mismatch (internal: ${payment.status}, Stripe: ${stripeData.status}) requires manual review`;
  result.needsManualReview = true;
  
  logger.warn({
    paymentId: discrepancy.paymentId,
    internalStatus: payment.status,
    stripeStatus: stripeData.status
  }, 'Payment status discrepancy flagged for manual review');
  
  return result;
}

/**
 * Resolves a missing internal record discrepancy
 */
async function resolveMissingInternal(
  discrepancy: PaymentDiscrepancy
): Promise<DiscrepancyResolutionResult> {
  // This is a serious issue that always requires manual review
  logger.error({
    stripePaymentId: discrepancy.details.stripeData?.id,
    discrepancy
  }, 'Missing internal payment record for Stripe payment');
  
  return {
    discrepancy,
    resolved: false,
    action: 'FLAGGED_FOR_REVIEW',
    notes: 'Missing internal payment record requires manual investigation',
    needsManualReview: true
  };
}

/**
 * Resolves a missing Stripe record discrepancy
 */
async function resolveMissingStripe(
  discrepancy: PaymentDiscrepancy
): Promise<DiscrepancyResolutionResult> {
  // This is a serious issue that always requires manual review
  logger.error({
    internalPaymentId: discrepancy.paymentId,
    discrepancy
  }, 'Missing Stripe payment record for internal payment');
  
  return {
    discrepancy,
    resolved: false,
    action: 'FLAGGED_FOR_REVIEW',
    notes: 'Missing Stripe payment record requires manual investigation',
    needsManualReview: true
  };
}

/**
 * Calculates the platform's revenue from fees for a given time period
 * 
 * @param startDate Start date for the calculation period
 * @param endDate End date for the calculation period
 * @returns Revenue report with breakdown by fee types
 */
export async function calculatePlatformRevenue(
  startDate: Date,
  endDate: Date
): Promise<RevenueReport> {
  logger.info({ startDate, endDate }, 'Calculating platform revenue');
  
  try {
    // Initialize revenue report
    const report: RevenueReport = {
      period: {
        startDate,
        endDate
      },
      total: 0,
      breakdown: {
        partnershipFees: 0,
        subscriptionRevenue: 0,
        additionalServiceFees: 0
      },
      transactionCount: 0,
      averageFee: 0
    };
    
    // Calculate partnership fees from payment records
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['COMPLETED', 'IN_ESCROW', 'RELEASED']
        }
      },
      select: {
        platformFee: true,
        type: true
      }
    });
    
    // Sum up platform fees from partnership payments
    let partnershipFees = new Decimal(0);
    let partnershipPaymentCount = 0;
    
    for (const payment of payments) {
      if (payment.type === 'MARKETPLACE' || payment.type === 'MILESTONE') {
        partnershipFees = partnershipFees.plus(payment.platformFee);
        partnershipPaymentCount++;
      }
    }
    
    report.breakdown.partnershipFees = partnershipFees.toNumber();
    
    // Calculate subscription revenue
    const subscriptions = await prisma.subscriptionBilling.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      },
      select: {
        amount: true
      }
    });
    
    let subscriptionRevenue = new Decimal(0);
    
    for (const subscription of subscriptions) {
      subscriptionRevenue = subscriptionRevenue.plus(subscription.amount);
    }
    
    report.breakdown.subscriptionRevenue = subscriptionRevenue.toNumber();
    
    // Calculate additional service fees (add-ons, etc.)
    const additionalFees = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        type: 'ADD_ON',
        status: {
          in: ['COMPLETED', 'RELEASED']
        }
      },
      select: {
        amount: true,
        platformFee: true
      }
    });
    
    let additionalServiceFees = new Decimal(0);
    
    for (const fee of additionalFees) {
      additionalServiceFees = additionalServiceFees.plus(fee.platformFee);
    }
    
    report.breakdown.additionalServiceFees = additionalServiceFees.toNumber();
    
    // Calculate total revenue and statistics
    report.total = partnershipFees
      .plus(subscriptionRevenue)
      .plus(additionalServiceFees)
      .toNumber();
    
    report.transactionCount = payments.length + subscriptions.length + additionalFees.length;
    
    // Calculate average fee if there are transactions
    if (report.transactionCount > 0) {
      report.averageFee = report.total / report.transactionCount;
    }
    
    logger.info({
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalRevenue: report.total,
      partnershipFees: report.breakdown.partnershipFees,
      subscriptionRevenue: report.breakdown.subscriptionRevenue,
      additionalServiceFees: report.breakdown.additionalServiceFees,
      transactionCount: report.transactionCount
    }, 'Platform revenue calculation completed');
    
    return report;
  } catch (error) {
    logger.error({ error, startDate, endDate }, 'Failed to calculate platform revenue');
    throw new TransactionError(
      `Failed to calculate platform revenue for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
      { cause: error }
    );
  }
}

/**
 * Service class that encapsulates reconciliation functionality with proper error handling and logging
 */
export class ReconciliationService {
  private paymentModel: PaymentModel;
  private decimalLib: typeof Decimal;
  
  /**
   * Initializes the reconciliation service with necessary dependencies
   */
  constructor() {
    this.paymentModel = new PaymentModel();
    this.decimalLib = Decimal;
    
    // Configure decimal for financial calculations
    this.decimalLib.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
    
    logger.info('ReconciliationService initialized');
  }
  
  /**
   * Service method to reconcile payments for a given period
   * 
   * @param startDate Start date for reconciliation
   * @param endDate End date for reconciliation
   * @returns Comprehensive reconciliation report
   */
  async reconcilePayments(startDate: Date, endDate: Date): Promise<ReconciliationReport> {
    // Validate input parameters
    if (!startDate || !endDate) {
      throw new TransactionError('Start date and end date are required for reconciliation');
    }
    
    if (startDate > endDate) {
      throw new TransactionError('Start date must be before end date');
    }
    
    logger.info({ startDate, endDate }, 'ReconciliationService.reconcilePayments called');
    
    try {
      // Call the reconciliation function with error handling
      const report = await reconcilePayments(startDate, endDate);
      
      logger.info({
        transactions: report.totalTransactions,
        discrepancies: report.discrepancies.length
      }, 'Reconciliation service completed successfully');
      
      return report;
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'ReconciliationService.reconcilePayments failed');
      throw new TransactionError(
        'Reconciliation service failed',
        { cause: error }
      );
    }
  }
  
  /**
   * Generates a monthly reconciliation report for accounting
   * 
   * @param year Year for the report
   * @param month Month for the report (1-12)
   * @returns Monthly financial reconciliation report
   */
  async generateMonthlyReport(year: number, month: number): Promise<MonthlyReconciliationReport> {
    logger.info({ year, month }, 'Generating monthly reconciliation report');
    
    try {
      // Validate input
      if (month < 1 || month > 12) {
        throw new TransactionError('Month must be between 1 and 12');
      }
      
      // Calculate the date range for the specified month
      const startDate = new Date(year, month - 1, 1); // Month is 0-indexed in Date
      const endDate = new Date(year, month, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      // Perform reconciliation for the period
      const reconciliationResults = await reconcilePayments(startDate, endDate);
      
      // Calculate revenue statistics
      const revenueData = await calculatePlatformRevenue(startDate, endDate);
      
      // Compile transaction summary
      const transactionSummary = await this.compileTransactionSummary(startDate, endDate);
      
      // Create the monthly report
      const monthlyReport: MonthlyReconciliationReport = {
        ...reconciliationResults,
        month,
        year,
        revenueData,
        transactionSummary
      };
      
      // Save report to database for historical records
      await prisma.monthlyReconciliationReport.create({
        data: {
          year,
          month,
          startDate,
          endDate,
          generatedAt: new Date(),
          totalTransactions: reconciliationResults.totalTransactions,
          totalAmount: reconciliationResults.totalAmount,
          totalRevenue: revenueData.total,
          reportData: monthlyReport
        }
      });
      
      logger.info({
        year,
        month,
        totalTransactions: reconciliationResults.totalTransactions,
        totalRevenue: revenueData.total
      }, 'Monthly reconciliation report generated successfully');
      
      return monthlyReport;
    } catch (error) {
      logger.error({ error, year, month }, 'Failed to generate monthly reconciliation report');
      throw new TransactionError(
        `Failed to generate monthly reconciliation report for ${year}-${month}`,
        { cause: error }
      );
    }
  }
  
  /**
   * Compiles transaction summary statistics for reports
   */
  private async compileTransactionSummary(
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyReconciliationReport['transactionSummary']> {
    // Initialize summary object
    const summary = {
      subscriptions: {
        count: 0,
        amount: 0
      },
      marketplaceTransactions: {
        count: 0,
        amount: 0,
        fees: 0
      },
      refunds: {
        count: 0,
        amount: 0
      }
    };
    
    // Count and sum subscription transactions
    const subscriptions = await prisma.subscriptionBilling.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    });
    
    summary.subscriptions.count = subscriptions.length;
    summary.subscriptions.amount = subscriptions.reduce(
      (total, sub) => total + Number(sub.amount),
      0
    );
    
    // Count and sum marketplace transactions
    const marketplacePayments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        type: {
          in: ['MARKETPLACE', 'MILESTONE']
        },
        status: {
          in: ['COMPLETED', 'IN_ESCROW', 'RELEASED']
        }
      }
    });
    
    summary.marketplaceTransactions.count = marketplacePayments.length;
    summary.marketplaceTransactions.amount = marketplacePayments.reduce(
      (total, payment) => total + Number(payment.amount),
      0
    );
    summary.marketplaceTransactions.fees = marketplacePayments.reduce(
      (total, payment) => total + Number(payment.platformFee),
      0
    );
    
    // Count and sum refunds
    const refunds = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'REFUNDED'
      }
    });
    
    summary.refunds.count = refunds.length;
    summary.refunds.amount = refunds.reduce(
      (total, refund) => total + Number(refund.refundAmount || 0),
      0
    );
    
    return summary;
  }
  
  /**
   * Audits a specific transaction for accuracy and completeness
   * 
   * @param transactionId ID of the transaction to audit
   * @returns Detailed audit results for the transaction
   */
  async auditTransaction(transactionId: string): Promise<TransactionAuditResult> {
    logger.info({ transactionId }, 'Auditing transaction');
    
    try {
      // Initialize audit result
      const result: TransactionAuditResult = {
        transactionId,
        paymentId: '',
        partnershipId: '',
        auditPassed: false,
        issues: [],
        platformFeeAccuracy: false,
        internalRecordMatch: false,
        stripeRecordMatch: false,
        auditTrail: []
      };
      
      // Retrieve the transaction record
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          payment: {
            include: {
              partnership: true
            }
          }
        }
      });
      
      if (!transaction) {
        throw new TransactionError(`Transaction not found: ${transactionId}`);
      }
      
      result.paymentId = transaction.paymentId;
      result.partnershipId = transaction.payment.partnershipId;
      
      // Add transaction retrieval to audit trail
      result.auditTrail.push({
        timestamp: new Date(),
        action: 'TRANSACTION_RETRIEVED',
        details: {
          transactionId,
          status: transaction.status,
          amount: transaction.amount
        }
      });
      
      // Verify the transaction data
      const payment = transaction.payment;
      
      // Check platform fee calculation accuracy
      const expectedFee = this.calculateExpectedFee(
        Number(payment.amount),
        payment.type
      );
      
      const actualFee = Number(payment.platformFee);
      const feeDifference = Math.abs(expectedFee - actualFee);
      
      result.platformFeeAccuracy = feeDifference < 0.01;
      
      if (!result.platformFeeAccuracy) {
        result.issues.push({
          description: 'Platform fee calculation does not match expected value',
          severity: 'MEDIUM',
          data: {
            expectedFee,
            actualFee,
            difference: feeDifference
          }
        });
      }
      
      // Verify Stripe payment data if available
      if (payment.stripePaymentIntentId) {
        try {
          const stripeData = await stripePayment.getPaymentDetails(payment.stripePaymentIntentId);
          
          // Compare amounts (Stripe amount is in cents)
          const stripeAmount = stripeData.amount / 100;
          const internalAmount = Number(payment.amount);
          const amountDifference = Math.abs(stripeAmount - internalAmount);
          
          result.stripeRecordMatch = amountDifference < 0.01;
          
          if (!result.stripeRecordMatch) {
            result.issues.push({
              description: 'Payment amount does not match Stripe record',
              severity: 'HIGH',
              data: {
                internalAmount,
                stripeAmount,
                difference: amountDifference
              }
            });
          }
          
          // Add Stripe verification to audit trail
          result.auditTrail.push({
            timestamp: new Date(),
            action: 'STRIPE_VERIFICATION',
            details: {
              stripeId: payment.stripePaymentIntentId,
              matched: result.stripeRecordMatch,
              stripeStatus: stripeData.status
            }
          });
        } catch (error) {
          result.issues.push({
            description: 'Failed to verify Stripe payment record',
            severity: 'HIGH',
            data: {
              error: error instanceof Error ? error.message : String(error),
              stripePaymentIntentId: payment.stripePaymentIntentId
            }
          });
          
          // Add error to audit trail
          result.auditTrail.push({
            timestamp: new Date(),
            action: 'STRIPE_VERIFICATION_ERROR',
            details: {
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      }
      
      // Verify internal records consistency
      const internalRecordsMatch = (
        Number(transaction.amount) === Number(payment.amount) &&
        transaction.status === this.mapPaymentStatusToTransactionStatus(payment.status)
      );
      
      result.internalRecordMatch = internalRecordsMatch;
      
      if (!internalRecordsMatch) {
        result.issues.push({
          description: 'Transaction and payment records do not match',
          severity: 'HIGH',
          data: {
            transactionAmount: transaction.amount,
            paymentAmount: payment.amount,
            transactionStatus: transaction.status,
            paymentStatus: payment.status
          }
        });
      }
      
      // Determine overall audit result
      result.auditPassed = (
        result.platformFeeAccuracy &&
        result.internalRecordMatch &&
        (payment.stripePaymentIntentId ? result.stripeRecordMatch : true) &&
        result.issues.length === 0
      );
      
      // Record final audit result
      result.auditTrail.push({
        timestamp: new Date(),
        action: 'AUDIT_COMPLETED',
        details: {
          passed: result.auditPassed,
          issueCount: result.issues.length
        }
      });
      
      logger.info({
        transactionId,
        passed: result.auditPassed,
        issues: result.issues.length
      }, 'Transaction audit completed');
      
      return result;
    } catch (error) {
      logger.error({ error, transactionId }, 'Failed to audit transaction');
      throw new TransactionError(
        `Failed to audit transaction ${transactionId}`,
        { cause: error }
      );
    }
  }
  
  /**
   * Calculates the expected platform fee for a payment
   */
  private calculateExpectedFee(amount: number, paymentType: string): number {
    // Fee percentages for different payment types
    const feePercentages: Record<string, number> = {
      'SUBSCRIPTION': 0, // No fee for subscription payments
      'MARKETPLACE': 8.0, // 8% fee for marketplace transactions
      'MILESTONE': 8.0, // 8% fee for milestone payments
      'ADD_ON': 8.0, // 8% fee for add-on purchases
      'REFUND': 0 // No fee for refunds
    };
    
    const feePercentage = feePercentages[paymentType] || 8.0;
    const feeAmount = (amount * feePercentage) / 100;
    
    // Round to 2 decimal places
    return Math.round(feeAmount * 100) / 100;
  }
  
  /**
   * Maps payment status to transaction status
   */
  private mapPaymentStatusToTransactionStatus(paymentStatus: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'COMPLETED': 'COMPLETED',
      'IN_ESCROW': 'COMPLETED',
      'RELEASED': 'COMPLETED',
      'FAILED': 'FAILED',
      'REFUNDED': 'REFUNDED',
      'DISPUTED': 'DISPUTED',
      'CANCELLED': 'CANCELLED'
    };
    
    return statusMap[paymentStatus] || 'PENDING';
  }
}