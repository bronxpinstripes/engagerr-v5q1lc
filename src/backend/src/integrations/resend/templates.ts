import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { EmailTemplateType } from '../../../types';
import { APP_NAME, APP_URL } from '../../../config/constants';
import { formatDate } from '../../../utils/dateTime';

// Base template data interface
interface BaseTemplateData {
  title: string;
  previewText: string;
  content: string;
  footerText?: string;
}

// Specific template data interfaces
interface VerificationTemplateData {
  userName: string;
  verificationLink: string;
  expiryHours: number;
}

interface PasswordResetTemplateData {
  userName: string;
  resetLink: string;
  expiryHours: number;
}

interface PartnershipUpdateTemplateData {
  userName: string;
  partnerName: string;
  updateType: string;
  partnershipId: string;
  actionLink: string;
  additionalDetails?: string;
}

interface ContentAnalysisTemplateData {
  creatorName: string;
  contentTitle: string;
  contentType: string;
  analysisDate: string;
  insightsSummary: Record<string, any>;
  dashboardLink: string;
}

interface WelcomeTemplateData {
  userName: string;
  accountType: string;
  dashboardLink: string;
  nextSteps: string[];
}

/**
 * Returns the appropriate email template based on the template type
 * 
 * @param templateType - The type of email template to generate
 * @param data - Data required for the template
 * @returns HTML content for the email
 */
export function getEmailTemplate(
  templateType: EmailTemplateType,
  data: Record<string, any>
): string {
  switch (templateType) {
    case EmailTemplateType.VERIFICATION:
      return generateVerificationEmailTemplate(data as VerificationTemplateData);
    case EmailTemplateType.PASSWORD_RESET:
      return generatePasswordResetTemplate(data as PasswordResetTemplateData);
    case EmailTemplateType.PARTNERSHIP_UPDATE:
      return generatePartnershipUpdateTemplate(data as PartnershipUpdateTemplateData);
    case EmailTemplateType.CONTENT_ANALYSIS:
      return generateContentAnalysisTemplate(data as ContentAnalysisTemplateData);
    case EmailTemplateType.WELCOME:
      return generateWelcomeTemplate(data as WelcomeTemplateData);
    default:
      throw new Error(`Unsupported email template type: ${templateType}`);
  }
}

/**
 * Generates HTML content for account verification emails
 * 
 * @param data - Verification email data
 * @returns HTML content for verification email
 */
export function generateVerificationEmailTemplate(data: VerificationTemplateData): string {
  const { userName, verificationLink, expiryHours } = data;
  
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hi ${userName},</p>
    <p>Thanks for signing up for ${APP_NAME}! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verify Email Address</a>
    </div>
    <p>This link will expire in ${expiryHours} hours.</p>
    <p>If you didn't create an account on ${APP_NAME}, you can safely ignore this email.</p>
    <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
    <p style="word-break: break-all; font-size: 14px; color: #666;">${verificationLink}</p>
  `;
  
  return generateBaseTemplate({
    title: `Verify Your Email Address - ${APP_NAME}`,
    previewText: `Please verify your email address for your ${APP_NAME} account.`,
    content
  });
}

/**
 * Generates HTML content for password reset emails
 * 
 * @param data - Password reset email data
 * @returns HTML content for password reset email
 */
export function generatePasswordResetTemplate(data: PasswordResetTemplateData): string {
  const { userName, resetLink, expiryHours } = data;
  
  const content = `
    <h2>Reset Your Password</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password for ${APP_NAME}. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
    </div>
    <p>This link will expire in ${expiryHours} hours.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your account is secure.</p>
    <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
    <p style="word-break: break-all; font-size: 14px; color: #666;">${resetLink}</p>
  `;
  
  return generateBaseTemplate({
    title: `Reset Your Password - ${APP_NAME}`,
    previewText: `Reset your password for your ${APP_NAME} account.`,
    content
  });
}

/**
 * Generates HTML content for partnership update notifications
 * 
 * @param data - Partnership update data
 * @returns HTML content for partnership update email
 */
export function generatePartnershipUpdateTemplate(data: PartnershipUpdateTemplateData): string {
  const { userName, partnerName, updateType, partnershipId, actionLink, additionalDetails } = data;
  
  let title = '';
  let previewText = '';
  let actionText = '';
  let updateDescription = '';
  
  switch (updateType) {
    case 'proposal':
      title = `New Partnership Proposal - ${APP_NAME}`;
      previewText = `${partnerName} has sent you a partnership proposal on ${APP_NAME}.`;
      actionText = 'View Proposal';
      updateDescription = `${partnerName} has sent you a new partnership proposal.`;
      break;
    case 'counter_proposal':
      title = `Counter Proposal Received - ${APP_NAME}`;
      previewText = `${partnerName} has countered your partnership proposal on ${APP_NAME}.`;
      actionText = 'View Counter Proposal';
      updateDescription = `${partnerName} has countered your partnership proposal with new terms.`;
      break;
    case 'proposal_accepted':
      title = `Proposal Accepted - ${APP_NAME}`;
      previewText = `${partnerName} has accepted your partnership proposal on ${APP_NAME}.`;
      actionText = 'View Partnership';
      updateDescription = `${partnerName} has accepted your partnership proposal. The next step is to review and sign the contract.`;
      break;
    case 'contract_ready':
      title = `Contract Ready for Signature - ${APP_NAME}`;
      previewText = `Your partnership contract with ${partnerName} is ready for signature on ${APP_NAME}.`;
      actionText = 'Review & Sign Contract';
      updateDescription = `Your partnership contract with ${partnerName} is now ready for your review and signature.`;
      break;
    case 'contract_signed':
      title = `Contract Signed - ${APP_NAME}`;
      previewText = `${partnerName} has signed the partnership contract on ${APP_NAME}.`;
      actionText = 'View Contract';
      updateDescription = `${partnerName} has signed the partnership contract. The partnership is now active.`;
      break;
    case 'payment_released':
      title = `Payment Released - ${APP_NAME}`;
      previewText = `A payment for your partnership with ${partnerName} has been released on ${APP_NAME}.`;
      actionText = 'View Payment Details';
      updateDescription = `A payment for your partnership with ${partnerName} has been released.`;
      break;
    case 'deliverable_submitted':
      title = `Deliverable Submitted - ${APP_NAME}`;
      previewText = `${partnerName} has submitted a deliverable for your partnership on ${APP_NAME}.`;
      actionText = 'Review Deliverable';
      updateDescription = `${partnerName} has submitted a deliverable for your review.`;
      break;
    case 'deliverable_approved':
      title = `Deliverable Approved - ${APP_NAME}`;
      previewText = `${partnerName} has approved your deliverable on ${APP_NAME}.`;
      actionText = 'View Partnership';
      updateDescription = `${partnerName} has approved your deliverable.`;
      break;
    default:
      title = `Partnership Update - ${APP_NAME}`;
      previewText = `There's an update to your partnership with ${partnerName} on ${APP_NAME}.`;
      actionText = 'View Partnership';
      updateDescription = `There's an update to your partnership with ${partnerName}.`;
  }
  
  const content = `
    <h2>${title.replace(` - ${APP_NAME}`, '')}</h2>
    <p>Hi ${userName},</p>
    <p>${updateDescription}</p>
    ${additionalDetails ? `<p>${additionalDetails}</p>` : ''}
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">${actionText}</a>
    </div>
    <p>Partnership ID: ${partnershipId}</p>
  `;
  
  return generateBaseTemplate({
    title,
    previewText,
    content
  });
}

/**
 * Generates HTML content for content analysis completion notifications
 * 
 * @param data - Content analysis data
 * @returns HTML content for content analysis email
 */
export function generateContentAnalysisTemplate(data: ContentAnalysisTemplateData): string {
  const { creatorName, contentTitle, contentType, analysisDate, insightsSummary, dashboardLink } = data;
  
  let insightsHtml = '';
  if (insightsSummary && Object.keys(insightsSummary).length > 0) {
    insightsHtml = '<h3>Key Insights:</h3><ul>';
    for (const key in insightsSummary) {
      if (Object.prototype.hasOwnProperty.call(insightsSummary, key)) {
        insightsHtml += `<li><strong>${key}:</strong> ${insightsSummary[key]}</li>`;
      }
    }
    insightsHtml += '</ul>';
  }
  
  const content = `
    <h2>Content Analysis Complete</h2>
    <p>Hi ${creatorName},</p>
    <p>The analysis for your ${contentType} "${contentTitle}" is now complete.</p>
    ${insightsHtml}
    <p>Analysis date: ${analysisDate}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">View Full Analysis</a>
    </div>
    <p>Log in to your dashboard to see complete insights, relationship mapping, and performance metrics.</p>
  `;
  
  return generateBaseTemplate({
    title: `Content Analysis Complete - ${APP_NAME}`,
    previewText: `Your content analysis for "${contentTitle}" is now available on ${APP_NAME}.`,
    content
  });
}

/**
 * Generates HTML content for welcome emails after account creation
 * 
 * @param data - Welcome email data
 * @returns HTML content for welcome email
 */
export function generateWelcomeTemplate(data: WelcomeTemplateData): string {
  const { userName, accountType, dashboardLink, nextSteps } = data;
  
  let stepsHtml = '';
  if (nextSteps && nextSteps.length > 0) {
    stepsHtml = '<h3>Next Steps:</h3><ol>';
    nextSteps.forEach(step => {
      stepsHtml += `<li>${step}</li>`;
    });
    stepsHtml += '</ol>';
  }
  
  const accountTypeText = accountType === 'creator' 
    ? 'Creator' 
    : accountType === 'brand' 
      ? 'Brand' 
      : 'User';
  
  const content = `
    <h2>Welcome to ${APP_NAME}!</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for joining ${APP_NAME} as a ${accountTypeText}. We're excited to have you on board!</p>
    ${stepsHtml}
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Go to Your Dashboard</a>
    </div>
    <p>If you have any questions, please don't hesitate to contact our support team.</p>
  `;
  
  return generateBaseTemplate({
    title: `Welcome to ${APP_NAME}!`,
    previewText: `Welcome to ${APP_NAME}! Get started with your new account.`,
    content
  });
}

/**
 * Generates the base HTML structure used by all email templates
 * 
 * @param data - Base template data
 * @returns Base HTML structure for emails
 */
function generateBaseTemplate(data: BaseTemplateData): string {
  const { title, previewText, content, footerText } = data;
  
  const defaultFooterText = `© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>${title}</title>
      <meta name="description" content="${previewText}">
      <!--[if mso]>
      <style type="text/css">
        .fallback-font {
          font-family: Arial, sans-serif;
        }
      </style>
      <![endif]-->
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f4f4f5;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #1f2937;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #2563EB;
          padding: 24px;
          text-align: center;
        }
        .header img {
          max-width: 150px;
          height: auto;
        }
        .content {
          padding: 32px 24px;
        }
        .footer {
          background-color: #f9fafb;
          padding: 24px;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
        h1, h2, h3 {
          color: #1f2937;
          margin-top: 0;
        }
        h2 {
          font-size: 24px;
          margin-bottom: 16px;
        }
        p {
          margin: 16px 0;
        }
        .button {
          background-color: #2563EB;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          display: inline-block;
          font-weight: bold;
        }
        .unsubscribe {
          margin-top: 16px;
          font-size: 12px;
          color: #9ca3af;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
            border-radius: 0;
          }
          .content {
            padding: 24px 16px;
          }
        }
      </style>
    </head>
    <body>
      <div style="display: none; max-height: 0; overflow: hidden;">
        ${previewText}
      </div>
      <div style="display: none; max-height: 0; overflow: hidden;">
        &#847; &zwnj; &#8203; &#8205; &#8204; &#8206; &#8207; &#8202; &#8203;
      </div>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table class="container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px;">
              <tr>
                <td class="header" style="background-color: #2563EB; padding: 24px; text-align: center;">
                  <a href="${APP_URL}" style="text-decoration: none; color: #ffffff;">
                    <h1 style="margin: 0; color: #ffffff;">Engagerr</h1>
                  </a>
                </td>
              </tr>
              <tr>
                <td class="content" style="padding: 32px 24px; background-color: #ffffff;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td class="footer" style="background-color: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #6b7280;">
                  <p style="margin-bottom: 8px;">${footerText || defaultFooterText}</p>
                  <p class="unsubscribe" style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
                    You're receiving this email because you have an account on ${APP_NAME}.<br>
                    If you'd like to change your notification preferences, you can do so in your account settings.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Minify the HTML by removing extra whitespace
  return html.replace(/\s+/g, ' ').trim();
}

/**
 * Renders a React component to an HTML string for email delivery
 * 
 * @param component - React component to render
 * @returns HTML string of the rendered component
 */
export function renderEmailComponent(component: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(component);
}