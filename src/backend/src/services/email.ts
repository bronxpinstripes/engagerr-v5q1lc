/**
 * Email Service
 * 
 * Provides a high-level interface for sending various types of emails
 * throughout the Engagerr platform, abstracting the implementation
 * details of the Resend email provider integration.
 * 
 * @module services/email
 * @version 1.0.0
 */

import { logger } from '../utils/logger';
import { ExternalServiceError } from '../utils/errors';
import { emailConfig, EmailTemplates } from '../config/email';
import resendService from '../integrations/resend';
import { UserType, PartnershipNotificationData, PaymentNotificationData } from '../types';
import { formatDate } from '../utils/dateTime';

/**
 * Interface defining the options for sending an email
 */
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/**
 * Interface defining an email attachment
 */
interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/**
 * Interface defining the result of sending an email
 */
interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Interface defining the data needed for content notification emails
 */
interface ContentNotificationData {
  contentId: string;
  contentTitle: string;
  contentType: string;
  analysisType: string;
  insightsSummary?: string;
}

/**
 * Sends an email verification link to a newly registered user
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param verificationToken - Token for email verification
 * @returns Promise resolving to email sending result
 */
export async function sendUserVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending verification email',
      email,
      action: 'user_verification'
    });

    // Construct verification URL with token
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      EmailTemplates.EMAIL_VERIFICATION,
      {
        userName: name,
        verificationLink: verificationUrl,
        expiryHours: 48 // Token expires in 48 hours
      },
      email,
      'Verify Your Email Address - Engagerr'
    );
    
    logger.info({
      message: 'Verification email sent',
      email,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send verification email',
      email,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a password reset link to a user who requested it
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param resetToken - Token for password reset
 * @returns Promise resolving to email sending result
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending password reset email',
      email,
      action: 'password_reset'
    });

    // Construct reset URL with token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      EmailTemplates.PASSWORD_RESET,
      {
        userName: name,
        resetLink: resetUrl,
        expiryHours: 24 // Token expires in 24 hours
      },
      email,
      'Reset Your Password - Engagerr'
    );
    
    logger.info({
      message: 'Password reset email sent',
      email,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send password reset email',
      email,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a welcome email to a newly verified user
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param userType - Type of user (creator or brand)
 * @returns Promise resolving to email sending result
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  userType: UserType
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending welcome email',
      email,
      userType,
      action: 'welcome'
    });

    // Determine dashboard URL based on user type
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    // Create appropriate getting started steps based on user type
    const nextSteps = userType === UserType.CREATOR
      ? [
          'Connect your social media platforms',
          'Map your content relationships',
          'Explore your analytics dashboard',
          'Generate your media kit'
        ]
      : [
          'Complete your brand profile',
          'Discover creators for partnerships',
          'Create your first campaign',
          'Explore trending content categories'
        ];
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      EmailTemplates.WELCOME,
      {
        userName: name,
        accountType: userType,
        dashboardUrl,
        nextSteps
      },
      email,
      'Welcome to Engagerr!'
    );
    
    logger.info({
      message: 'Welcome email sent',
      email,
      userType,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send welcome email',
      email,
      userType,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a notification about partnership events like requests, approvals, or updates
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param data - Partnership notification data
 * @returns Promise resolving to email sending result
 */
export async function sendPartnershipNotificationEmail(
  email: string,
  name: string,
  data: PartnershipNotificationData
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending partnership notification email',
      email,
      partnershipId: data.partnershipId,
      notificationType: data.type,
      action: 'partnership_notification'
    });

    // Determine which template to use based on notification type
    let templateName = EmailTemplates.PARTNERSHIP_REQUEST;
    let subject = 'Partnership Update';
    
    switch (data.type) {
      case 'proposal':
        subject = 'New Partnership Proposal';
        templateName = EmailTemplates.PARTNERSHIP_REQUEST;
        break;
      case 'counter_proposal':
        subject = 'Counter Proposal Received';
        templateName = EmailTemplates.PARTNERSHIP_REQUEST;
        break;
      case 'proposal_accepted':
        subject = 'Partnership Proposal Accepted';
        templateName = EmailTemplates.PARTNERSHIP_ACCEPTED;
        break;
      case 'contract_ready':
        subject = 'Contract Ready for Signature';
        templateName = EmailTemplates.PARTNERSHIP_ACCEPTED;
        break;
      case 'deliverable_submitted':
        subject = 'Deliverable Submitted';
        templateName = EmailTemplates.PARTNERSHIP_ACCEPTED;
        break;
      // Additional cases can be added as needed
    }
    
    // Construct partnership URL
    const partnershipUrl = `${process.env.FRONTEND_URL}/partnerships/${data.partnershipId}`;
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      templateName,
      {
        userName: name,
        partnerName: data.partnerName,
        updateType: data.type,
        partnershipId: data.partnershipId,
        actionLink: partnershipUrl,
        additionalDetails: data.message,
        details: data.details
      },
      email,
      `${subject} - Engagerr`
    );
    
    logger.info({
      message: 'Partnership notification email sent',
      email,
      partnershipId: data.partnershipId,
      notificationType: data.type,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send partnership notification email',
      email,
      partnershipId: data.partnershipId,
      notificationType: data.type,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a notification about payment events like processing, release, or failure
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param data - Payment notification data
 * @returns Promise resolving to email sending result
 */
export async function sendPaymentNotificationEmail(
  email: string,
  name: string,
  data: PaymentNotificationData
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending payment notification email',
      email,
      paymentId: data.paymentId,
      notificationType: data.type,
      action: 'payment_notification'
    });

    // Determine which template and subject to use based on notification type
    let templateName = EmailTemplates.PAYMENT_RECEIVED;
    let subject = 'Payment Notification';
    
    switch (data.type) {
      case 'received':
        subject = 'Payment Received';
        templateName = EmailTemplates.PAYMENT_RECEIVED;
        break;
      case 'released':
        subject = 'Payment Released from Escrow';
        templateName = EmailTemplates.PAYMENT_RELEASED;
        break;
      case 'failed':
        subject = 'Payment Processing Failed';
        templateName = EmailTemplates.PAYMENT_RECEIVED; // Use generic template but customize content
        break;
      // Additional cases can be added as needed
    }
    
    // Construct relevant URL
    const actionUrl = data.partnershipId
      ? `${process.env.FRONTEND_URL}/partnerships/${data.partnershipId}/payments`
      : `${process.env.FRONTEND_URL}/payments`;
    
    // Format amount with currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency
    }).format(parseFloat(data.amount));
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      templateName,
      {
        userName: name,
        paymentId: data.paymentId,
        amount: formattedAmount,
        rawAmount: data.amount,
        currency: data.currency,
        type: data.type,
        partnerName: data.partnerName,
        actionLink: actionUrl,
        details: data.details
      },
      email,
      `${subject} - Engagerr`
    );
    
    logger.info({
      message: 'Payment notification email sent',
      email,
      paymentId: data.paymentId,
      notificationType: data.type,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send payment notification email',
      email,
      paymentId: data.paymentId,
      notificationType: data.type,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a notification when content analysis is complete
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param data - Content notification data
 * @returns Promise resolving to email sending result
 */
export async function sendContentAnalysisNotificationEmail(
  email: string,
  name: string,
  data: ContentNotificationData
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending content analysis notification email',
      email,
      contentId: data.contentId,
      analysisType: data.analysisType,
      action: 'content_analysis_notification'
    });

    // Construct analytics URL for the specific content
    const analyticsUrl = `${process.env.FRONTEND_URL}/analytics/content/${data.contentId}`;
    
    // Format analysis summary if available
    let formattedSummary = '';
    if (data.insightsSummary) {
      formattedSummary = typeof data.insightsSummary === 'string'
        ? data.insightsSummary
        : JSON.stringify(data.insightsSummary);
    }
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      EmailTemplates.CONTENT_ANALYSIS_COMPLETE,
      {
        creatorName: name,
        contentTitle: data.contentTitle,
        contentType: data.contentType,
        analysisType: data.analysisType,
        analysisDate: formatDate(new Date()),
        insightsSummary: formattedSummary,
        dashboardLink: analyticsUrl
      },
      email,
      `Content Analysis Complete: ${data.contentTitle} - Engagerr`
    );
    
    logger.info({
      message: 'Content analysis notification email sent',
      email,
      contentId: data.contentId,
      analysisType: data.analysisType,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send content analysis notification email',
      email,
      contentId: data.contentId,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sends a notification when a user receives a new message
 * 
 * @param email - Recipient's email address
 * @param name - Recipient's name
 * @param senderName - Name of the message sender
 * @param conversationId - ID of the conversation
 * @param messagePreview - Preview of the message content
 * @returns Promise resolving to email sending result
 */
export async function sendNewMessageNotificationEmail(
  email: string,
  name: string,
  senderName: string,
  conversationId: string,
  messagePreview: string
): Promise<EmailResult> {
  try {
    logger.info({
      message: 'Sending new message notification email',
      email,
      conversationId,
      sender: senderName,
      action: 'new_message_notification'
    });

    // Construct conversation URL
    const conversationUrl = `${process.env.FRONTEND_URL}/messages/${conversationId}`;
    
    // Truncate message preview if too long
    const truncatedPreview = messagePreview.length > 150
      ? `${messagePreview.substring(0, 147)}...`
      : messagePreview;
    
    // Send email using template
    const result = await sendEmailWithTemplate(
      EmailTemplates.NEW_MESSAGE,
      {
        userName: name,
        senderName,
        messagePreview: truncatedPreview,
        conversationLink: conversationUrl,
        timestamp: formatDate(new Date(), 'DATETIME_DISPLAY')
      },
      email,
      `New Message from ${senderName} - Engagerr`
    );
    
    logger.info({
      message: 'New message notification email sent',
      email,
      conversationId,
      sender: senderName,
      success: result.success,
      messageId: result.messageId
    });
    
    return result;
  } catch (error) {
    logger.error({
      message: 'Failed to send new message notification email',
      email,
      conversationId,
      sender: senderName,
      error
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Internal helper function that sends an email using a specified template
 * 
 * @param templateName - Name of the email template to use
 * @param templateData - Data to be injected into the template
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param options - Additional email options
 * @returns Promise resolving to email sending result
 */
async function sendEmailWithTemplate(
  templateName: EmailTemplates,
  templateData: Record<string, any>,
  to: string,
  subject: string,
  options: Partial<EmailOptions> = {}
): Promise<EmailResult> {
  try {
    // Skip sending if in sandbox mode and not configured to respect it
    if (emailConfig.sandboxMode && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      logger.info({
        message: 'Skipping email send due to sandbox mode',
        to,
        subject,
        templateName
      });
      
      return {
        success: true,
        messageId: 'sandbox-mode'
      };
    }
    
    // Generate email HTML using template
    // (In a real implementation, this would use a template engine)
    // This is a simplified version for this example
    const html = `Template ${templateName} rendered with data: ${JSON.stringify(templateData)}`;
    
    // Default options merged with provided options
    const emailOptions: EmailOptions = {
      to,
      subject,
      html,
      from: formatEmailAddress(emailConfig.defaultFromEmail, emailConfig.defaultFromName),
      ...options
    };
    
    // Send email using resend integration
    const result = await resendService.sendEmail(emailOptions);
    
    return {
      success: true,
      messageId: result.id
    };
  } catch (error) {
    logger.error({
      message: 'Email sending failed',
      templateName,
      to,
      subject,
      error
    });
    
    if (error instanceof Error) {
      throw new ExternalServiceError(`Failed to send email: ${error.message}`, 'ResendAPI');
    } else {
      throw new ExternalServiceError('Failed to send email: Unknown error', 'ResendAPI');
    }
  }
}

/**
 * Helper function to format email addresses with name and email
 * 
 * @param email - Email address
 * @param name - Name to include with the email address
 * @returns Formatted email address string
 */
function formatEmailAddress(email: string, name?: string): string {
  if (!name) {
    return email;
  }
  
  return `${name} <${email}>`;
}