/**
 * Form Types
 * 
 * This file contains TypeScript type definitions for form handling throughout the Engagerr application.
 * It provides interfaces and types for form fields, validation schemas, and form state management
 * compatible with React Hook Form.
 */

import { UserType } from '../types/user';
import { PlatformType } from '../types/platform';
import { ContentType } from '../types/content';
import { FieldValues, UseFormReturn, RegisterOptions } from 'react-hook-form'; // react-hook-form v7.45+
import { ObjectSchema } from 'yup'; // yup v1.2+
import { ReactNode } from 'react'; // react v18.0+

/**
 * Common properties for form field components
 */
export interface FormFieldProps {
  /** Field name, must match the form schema */
  name: string;
  /** Display label for the field */
  label: string;
  /** Optional description or help text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
}

/**
 * Common form state properties
 */
export interface FormState {
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Whether all form fields are valid */
  isValid: boolean;
  /** Record of field errors */
  errors: Record<string, string>;
}

/**
 * Values for the login form
 */
export interface LoginFormValues {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Whether to remember the user's session */
  rememberMe: boolean;
}

/**
 * Values for the registration form
 */
export interface RegisterFormValues {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
  /** User's full name */
  fullName: string;
  /** Type of user account (creator or brand) */
  userType: UserType;
  /** Whether terms and conditions are accepted */
  termsAccepted: boolean;
}

/**
 * Values for the creator profile form
 */
export interface CreatorProfileFormValues {
  /** Creator bio or description */
  bio: string;
  /** Content categories/niches */
  categories: string[];
  /** Profile image file */
  profileImage: File | null;
}

/**
 * Values for the brand profile form
 */
export interface BrandProfileFormValues {
  /** Company or brand name */
  companyName: string;
  /** Industry categories */
  industries: string[];
  /** Brand website URL */
  websiteUrl: string;
  /** Logo image file */
  logoImage: File | null;
}

/**
 * Values for connecting social media platforms
 */
export interface PlatformConnectionFormValues {
  /** Type of platform to connect */
  platformType: PlatformType;
  /** Username or handle on the platform */
  handle: string;
  /** URL to the profile on the platform */
  url: string;
}

/**
 * Values for adding new content
 */
export interface ContentAddFormValues {
  /** Content title */
  title: string;
  /** Content description */
  description: string;
  /** Type of content */
  contentType: ContentType;
  /** ID of the platform where content is hosted */
  platformId: string;
  /** Platform-specific external ID */
  externalId: string;
  /** URL to the content */
  url: string;
  /** Publication date */
  publishedAt: Date;
  /** Optional parent content ID for establishing relationships */
  parentContentId: string | null;
}

/**
 * Values for creating content relationships
 */
export interface RelationshipFormValues {
  /** ID of the source/parent content */
  sourceContentId: string;
  /** ID of the target/child content */
  targetContentId: string;
  /** Type of relationship */
  relationshipType: string;
}

/**
 * Values for creating a campaign
 */
export interface CampaignFormValues {
  /** Campaign name */
  name: string;
  /** Campaign description */
  description: string;
  /** Campaign start date */
  startDate: Date;
  /** Campaign end date */
  endDate: Date;
  /** Campaign budget */
  budget: number;
  /** Key messaging points */
  keyMessages: string[];
  /** Target number of creators */
  creatorCount: number;
}

/**
 * Item in deliverables list for proposals
 */
export interface DeliverableItem {
  /** Platform where deliverable will be published */
  platformType: PlatformType;
  /** Type of content to be delivered */
  contentType: ContentType;
  /** Description of the deliverable */
  description: string;
  /** Due date for the deliverable */
  dueDate: Date;
}

/**
 * Values for creating a partnership proposal
 */
export interface ProposalFormValues {
  /** ID of the campaign this proposal belongs to */
  campaignId: string;
  /** ID of the creator being proposed to */
  creatorId: string;
  /** List of deliverables in the proposal */
  deliverables: DeliverableItem[];
  /** Total compensation amount */
  compensation: number;
  /** Payment schedule description */
  paymentSchedule: string;
  /** Additional terms and conditions */
  terms: string;
}

/**
 * Values for generating a media kit
 */
export interface MediaKitFormValues {
  /** Media kit template identifier */
  template: string;
  /** Creator name for the media kit */
  name: string;
  /** Creator bio/description */
  bio: string;
  /** Creator categories/niches */
  categories: string[];
  /** Cover image file */
  coverImage: File | null;
  /** Contact information */
  contact: string;
  /** Platforms to include in the media kit */
  includedPlatforms: string[];
  /** IDs of content to feature */
  featuredContent: string[];
  /** Whether to include rate card information */
  showRateCard: boolean;
}

/**
 * Values for creator discovery search
 */
export interface SearchFormValues {
  /** Search query text */
  query: string;
  /** Content categories to filter by */
  categories: string[];
  /** Platforms to include */
  platforms: PlatformType[];
  /** Minimum follower count */
  followerRangeMin: number;
  /** Maximum follower count */
  followerRangeMax: number;
  /** Minimum engagement rate */
  engagementRateMin: number;
  /** Maximum engagement rate */
  engagementRateMax: number;
  /** Geographic location filter */
  location: string;
}

/**
 * Configuration options for form initialization
 */
export interface FormConfig {
  /** Default values for form fields */
  defaultValues: Record<string, any>;
  /** Yup validation schema */
  validationSchema: ObjectSchema<any>;
  /** Form validation mode */
  mode: string;
}

/**
 * Props for the main Form component
 */
export interface FormProps {
  /** Form submission handler */
  onSubmit: (data: any) => void | Promise<void>;
  /** Form children */
  children: ReactNode;
  /** Optional CSS class name */
  className?: string;
}