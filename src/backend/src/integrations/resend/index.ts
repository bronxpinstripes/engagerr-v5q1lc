import { Resend } from 'resend'; // v1.0.0
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';
import { emailConfig } from '../../config/email';
import templates from './templates';
import { UserType } from '../../types';

// Types
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
  replyTo?: string;
  attachments?: Attachment[];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface Attachment {
  filename: string;
  content: string;
  type?: string;
}

export interface PartnershipNotificationData {
  partnershipId: string;
  partnerName: string;
  type: string;
  message?: string;
  details?: object;
}

export interface PaymentNotificationData {
  paymentId: string;
  amount: string;
  currency: string;
  type: string;
  partnershipId?: string;
  partnerName?: string;
  details?: object;
}

// Initialize Resend client
let resendClient: Resend | null = null;

function initResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(emailConfig.resendApiKey);
  }
  return resendClient;
}

/**
 * Sends an email using the Resend API with error handling and logging
 * 
 * @param options - Email sending options
 * @returns Promise resolving to email sending result
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const client = initResend();
    
    logger.info({
      message: 'Sending email',
      recipient: options.to,
      subject: options.subject
    });
    
    const response = await client.emails.send({
      from: options.from || `${emailConfig.defaultFromName} <${emailConfig.defaultFromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      headers: options.headers,
      attachments: options.attachments
    });
    
    if ('error' in response) {
      throw new Error(`Resend API error: ${response.error.message}`);
    }
    
    logger.info({
      message: 'Email sent successfully',
      recipient: options.to,
      emailId: response.id
    });
    
    return {
      success: true,
      id: response.id
    };
  } catch (error) {
    logger.error({
      message: 'Failed to send email',
      error,
      recipient: options.to,
      subject: options.subject
    });
    
    throw new ApiError(
      `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      'EMAIL_SERVICE_ERROR'
    );
  }
}

/**
 * Sends a verification email to a new user
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param verificationToken - Token for email verification
 * @returns Promise resolving to email sending result
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<EmailResult> {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const html = templates.renderTemplate('EMAIL_VERIFICATION', {
    userName: name,
    verificationLink,
    expiryHours: 48 // Token expiry in hours
  });
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address - Engagerr',
    html
  });
}

/**
 * Sends a password reset email to a user
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param resetToken - Token for password reset
 * @returns Promise resolving to email sending result
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<EmailResult> {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = templates.renderTemplate('PASSWORD_RESET', {
    userName: name,
    resetLink,
    expiryHours: 24 // Token expiry in hours
  });
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Engagerr',
    html
  });
}

/**
 * Sends a notification about a new partnership proposal or update
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param data - Partnership notification data
 * @returns Promise resolving to email sending result
 */
export async function sendPartnershipNotification(
  email: string,
  name: string,
  data: PartnershipNotificationData
): Promise<EmailResult> {
  const actionLink = `${process.env.FRONTEND_URL}/partnerships/${data.partnershipId}`;
  
  const html = templates.renderTemplate('PARTNERSHIP_REQUEST', {
    userName: name,
    partnerName: data.partnerName,
    updateType: data.type,
    partnershipId: data.partnershipId,
    actionLink,
    additionalDetails: data.message,
    details: data.details
  });
  
  let subject = 'Partnership Update';
  switch (data.type) {
    case 'proposal':
      subject = 'New Partnership Proposal';
      break;
    case 'counter_proposal':
      subject = 'Counter Proposal Received';
      break;
    case 'proposal_accepted':
      subject = 'Partnership Proposal Accepted';
      break;
    case 'contract_ready':
      subject = 'Contract Ready for Signature';
      break;
    case 'contract_signed':
      subject = 'Contract Signed';
      break;
    case 'payment_released':
      subject = 'Payment Released';
      break;
    case 'deliverable_submitted':
      subject = 'Deliverable Submitted';
      break;
    case 'deliverable_approved':
      subject = 'Deliverable Approved';
      break;
  }
  
  return sendEmail({
    to: email,
    subject: `${subject} - Engagerr`,
    html
  });
}

/**
 * Sends a welcome email to a newly verified user
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param userType - Type of user (creator or brand)
 * @returns Promise resolving to email sending result
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  userType: UserType
): Promise<EmailResult> {
  const dashboardLink = `${process.env.FRONTEND_URL}/dashboard`;
  
  const nextSteps = userType === 'creator'
    ? [
        'Connect your social media platforms',
        'Map your content relationships',
        'Explore your analytics dashboard',
        'Generate your media kit'
      ]
    : [
        'Complete your brand profile',
        'Discover creators for partnerships',
        'Start your first campaign',
        'Explore trending content categories'
      ];
  
  const html = templates.renderTemplate('WELCOME', {
    userName: name,
    accountType: userType,
    dashboardLink,
    nextSteps
  });
  
  return sendEmail({
    to: email,
    subject: 'Welcome to Engagerr!',
    html
  });
}

/**
 * Sends a notification about a payment event (successful payment, escrow release, etc.)
 * 
 * @param email - Recipient email address
 * @param name - Recipient name
 * @param data - Payment notification data
 * @returns Promise resolving to email sending result
 */
export async function sendPaymentNotification(
  email: string,
  name: string,
  data: PaymentNotificationData
): Promise<EmailResult> {
  const actionLink = data.partnershipId
    ? `${process.env.FRONTEND_URL}/partnerships/${data.partnershipId}/payments`
    : `${process.env.FRONTEND_URL}/payments`;
  
  const html = templates.renderTemplate('PAYMENT_RECEIVED', {
    userName: name,
    paymentId: data.paymentId,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
    partnerName: data.partnerName,
    actionLink,
    details: data.details
  });
  
  let subject = 'Payment Notification';
  switch (data.type) {
    case 'received':
      subject = 'Payment Received';
      break;
    case 'released':
      subject = 'Payment Released from Escrow';
      break;
    case 'refunded':
      subject = 'Payment Refunded';
      break;
    case 'subscription_renewal':
      subject = 'Subscription Renewed';
      break;
    case 'subscription_payment_failed':
      subject = 'Subscription Payment Failed';
      break;
  }
  
  return sendEmail({
    to: email,
    subject: `${subject} - Engagerr`,
    html
  });
}