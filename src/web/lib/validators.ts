import * as yup from 'yup'; // v1.2.0
import { ContentType, RelationshipType } from '../types/content';
import { PlatformType } from '../types/platform';
import { UserType } from '../types/user';
import { CampaignStatus } from '../types/campaign';

/**
 * Validates an email address format
 * @param email Email address to validate
 * @returns True if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * Checks if a password meets the required strength criteria
 * @param password Password to validate
 * @returns True if password meets criteria, false otherwise
 */
export const validatePassword = (password: string): boolean => {
  // Minimum 10 characters with at least one uppercase, lowercase, number, and special character
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

/**
 * Validates a URL format
 * @param url URL to validate
 * @returns True if URL is valid, false otherwise
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates a URL for a specific platform and extracts content ID if valid
 * @param url URL to validate
 * @param platformType Platform to validate URL against
 * @returns Object containing validation result and optional content ID
 */
export const validatePlatformUrl = (url: string, platformType: PlatformType): { valid: boolean; contentId?: string } => {
  if (!validateUrl(url)) {
    return { valid: false };
  }

  switch (platformType) {
    case PlatformType.YOUTUBE: {
      // YouTube video URL pattern (handles both youtube.com and youtu.be)
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      return match ? { valid: true, contentId: match[1] } : { valid: false };
    }
    case PlatformType.INSTAGRAM: {
      // Instagram post URL pattern
      const instagramRegex = /instagram\.com\/(?:p|reel)\/([a-zA-Z0-9_-]+)/;
      const match = url.match(instagramRegex);
      return match ? { valid: true, contentId: match[1] } : { valid: false };
    }
    case PlatformType.TIKTOK: {
      // TikTok video URL pattern
      const tiktokRegex = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
      const match = url.match(tiktokRegex);
      return match ? { valid: true, contentId: match[1] } : { valid: false };
    }
    case PlatformType.TWITTER: {
      // Twitter tweet URL pattern
      const twitterRegex = /twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/;
      const match = url.match(twitterRegex);
      return match ? { valid: true, contentId: match[2] } : { valid: false };
    }
    case PlatformType.LINKEDIN: {
      // LinkedIn post URL pattern
      const linkedinRegex = /linkedin\.com\/(?:posts|pulse)\/([\w-]+)/;
      const match = url.match(linkedinRegex);
      return match ? { valid: true, contentId: match[1] } : { valid: false };
    }
    case PlatformType.PODCAST: {
      // Generic podcast episode URL pattern (simplified)
      const podcastRegex = /(?:podcasts|episodes)\/([a-zA-Z0-9_-]+)/;
      const match = url.match(podcastRegex);
      return match ? { valid: true, contentId: match[1] } : { valid: false };
    }
    default:
      return { valid: false };
  }
};

// Login form validation schema
export const loginSchema = yup.object({
  email: yup
    .string()
    .required('Please enter a valid email address')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required'),
  rememberMe: yup
    .boolean()
    .optional()
});

// Registration form validation schema
export const registerSchema = yup.object({
  email: yup
    .string()
    .required('Please enter a valid email address')
    .email('Please enter a valid email address'),
  fullName: yup
    .string()
    .required('Full name is required')
    .min(2, 'Full name must be at least 2 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(10, 'Password must be at least 10 characters')
    .test(
      'password-strength',
      'Password must include uppercase, lowercase, number, and special character',
      validatePassword
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  userType: yup
    .string()
    .required('Please select an account type')
    .oneOf(Object.values(UserType), 'Invalid account type'),
  termsAccepted: yup
    .boolean()
    .oneOf([true], 'You must accept the terms and conditions')
});

// Password reset validation schema
export const resetPasswordSchema = yup.object({
  email: yup
    .string()
    .required('Please enter a valid email address')
    .email('Please enter a valid email address')
});

// Password update validation schema
export const updatePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(10, 'Password must be at least 10 characters')
    .test(
      'password-strength',
      'Password must include uppercase, lowercase, number, and special character',
      validatePassword
    )
    .notOneOf([yup.ref('currentPassword')], 'New password cannot be the same as current password'),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
});

// Creator profile validation schema
export const creatorProfileSchema = yup.object({
  displayName: yup
    .string()
    .required('Display name is required')
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name cannot exceed 50 characters'),
  bio: yup
    .string()
    .required('Bio is required')
    .min(10, 'Bio must be at least 10 characters')
    .max(1000, 'Bio cannot exceed 1000 characters'),
  shortBio: yup
    .string()
    .max(150, 'Short bio cannot exceed 150 characters')
    .optional(),
  categories: yup
    .array()
    .of(yup.string())
    .min(1, 'Please select at least one category')
    .max(5, 'Cannot select more than 5 categories'),
  location: yup
    .string()
    .optional(),
  websiteUrl: yup
    .string()
    .optional()
    .test('valid-url', 'Please enter a valid URL', (value) => {
      if (!value) return true;
      return validateUrl(value);
    }),
  contactEmail: yup
    .string()
    .optional()
    .email('Please enter a valid email address'),
  isPublic: yup
    .boolean()
    .required('Profile visibility preference is required')
});

// Brand profile validation schema
export const brandProfileSchema = yup.object({
  companyName: yup
    .string()
    .required('Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name cannot exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
  industries: yup
    .array()
    .of(yup.string())
    .min(1, 'Please select at least one industry')
    .max(5, 'Cannot select more than 5 industries'),
  logoImage: yup
    .string()
    .optional(),
  coverImage: yup
    .string()
    .optional(),
  websiteUrl: yup
    .string()
    .required('Website URL is required')
    .test('valid-url', 'Please enter a valid URL', validateUrl),
  socialLinks: yup
    .object()
    .optional(),
  location: yup
    .string()
    .optional(),
  size: yup
    .string()
    .optional(),
  founded: yup
    .number()
    .optional()
    .min(1800, 'Year must be after 1800')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
  contactEmail: yup
    .string()
    .required('Contact email is required')
    .email('Please enter a valid email address'),
  contactPhone: yup
    .string()
    .optional(),
  brandValues: yup
    .array()
    .of(yup.string())
    .optional()
});

// Platform connection validation schema
export const platformConnectionSchema = yup.object({
  platformType: yup
    .string()
    .required('Platform is required')
    .oneOf(Object.values(PlatformType), 'Invalid platform type'),
  handle: yup
    .string()
    .when('entryMethod', {
      is: 'manual',
      then: (schema) => schema.required('Handle is required').min(2, 'Handle must be at least 2 characters')
    }),
  url: yup
    .string()
    .when('entryMethod', {
      is: 'url',
      then: (schema) => schema.required('URL is required').test(
        'valid-platform-url', 
        'Please enter a valid platform URL', 
        function(value) {
          const { platformType } = this.parent;
          if (!value || !platformType) return false;
          return validatePlatformUrl(value, platformType as PlatformType).valid;
        }
      )
    }),
  entryMethod: yup
    .string()
    .required('Entry method is required')
    .oneOf(['oauth', 'url', 'manual'], 'Invalid entry method')
});

// Content form validation schema
export const contentSchema = yup.object({
  platformId: yup
    .string()
    .required('Platform is required')
    .uuid('Invalid platform ID'),
  title: yup
    .string()
    .required('Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: yup
    .string()
    .optional()
    .max(500, 'Description cannot exceed 500 characters'),
  contentType: yup
    .string()
    .required('Content type is required')
    .oneOf(Object.values(ContentType), 'Invalid content type'),
  url: yup
    .string()
    .required('URL is required')
    .test('valid-url', 'Please enter a valid URL', validateUrl),
  publishedAt: yup
    .date()
    .required('Published date is required')
    .max(new Date(), 'Published date cannot be in the future'),
  tags: yup
    .array()
    .of(yup.string())
    .optional()
});

// Content mapping validation schema
export const contentMappingSchema = yup.object({
  platformId: yup
    .string()
    .required('Please select a platform')
    .uuid('Invalid platform ID'),
  entryMethod: yup
    .string()
    .required('Invalid entry method')
    .oneOf(['url', 'manual'], 'Invalid entry method'),
  url: yup
    .string()
    .when('entryMethod', {
      is: 'url',
      then: (schema) => schema.required('Please enter a valid content URL').test(
        'valid-platform-url', 
        'Please enter a valid platform URL', 
        function(value) {
          if (!value) return false;
          return validateUrl(value);
        }
      )
    }),
  title: yup
    .string()
    .when('entryMethod', {
      is: 'manual',
      then: (schema) => schema.required('Title is required')
        .min(2, 'Title must be at least 2 characters')
        .max(100, 'Title cannot exceed 100 characters')
    }),
  description: yup
    .string()
    .optional()
    .max(500, 'Description cannot exceed 500 characters'),
  contentType: yup
    .string()
    .when('entryMethod', {
      is: 'manual',
      then: (schema) => schema.required('Please select a content type')
        .oneOf(Object.values(ContentType), 'Invalid content type')
    }),
  publishedAt: yup
    .date()
    .when('entryMethod', {
      is: 'manual',
      then: (schema) => schema.required('Published date is required')
        .max(new Date(), 'Published date cannot be in the future')
    }),
  parentContentId: yup
    .string()
    .uuid('Invalid parent content selection')
    .optional(),
  relationshipType: yup
    .string()
    .when('parentContentId', {
      is: (val: string) => val && val.length > 0,
      then: (schema) => schema.required('Please select a relationship type')
        .oneOf(Object.values(RelationshipType), 'Invalid relationship type')
    })
});

// Campaign form validation schema
export const campaignSchema = yup.object({
  name: yup
    .string()
    .required('Campaign name is required')
    .min(2, 'Campaign name must be at least 2 characters')
    .max(100, 'Campaign name cannot exceed 100 characters'),
  description: yup
    .string()
    .required('Campaign description is required')
    .max(1000, 'Campaign description cannot exceed 1000 characters'),
  startDate: yup
    .date()
    .required('Start date is required')
    .min(new Date(), 'Start date must be today or in the future'),
  endDate: yup
    .date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date'),
  budget: yup
    .number()
    .required('Budget is required')
    .min(100, 'Budget must be at least $100'),
  targetCreatorCount: yup
    .number()
    .required('Target creator count is required')
    .integer('Target creator count must be a whole number')
    .min(1, 'Target creator count must be at least 1'),
  keyMessages: yup
    .array()
    .of(yup.string())
    .max(5, 'Key messages cannot exceed 5 items')
    .optional(),
  status: yup
    .string()
    .optional()
    .oneOf(Object.values(CampaignStatus), 'Invalid campaign status')
});

// Partnership proposal validation schema
export const partnershipProposalSchema = yup.object({
  brandId: yup
    .string()
    .required('Brand is required')
    .uuid('Invalid brand ID'),
  creatorId: yup
    .string()
    .required('Creator is required')
    .uuid('Invalid creator ID'),
  campaignId: yup
    .string()
    .uuid('Invalid campaign ID')
    .optional()
    .nullable(),
  title: yup
    .string()
    .required('Proposal title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: yup
    .string()
    .required('Proposal description is required')
    .max(1000, 'Description cannot exceed 1000 characters'),
  deliverables: yup
    .array()
    .of(
      yup.object({
        platformType: yup
          .string()
          .required('Platform is required')
          .oneOf(Object.values(PlatformType), 'Invalid platform type'),
        contentType: yup
          .string()
          .required('Content type is required')
          .oneOf(Object.values(ContentType), 'Invalid content type'),
        description: yup
          .string()
          .required('Description is required')
          .max(200, 'Description cannot exceed 200 characters'),
        requirements: yup
          .string()
          .optional()
          .max(500, 'Requirements cannot exceed 500 characters'),
        dueDate: yup
          .date()
          .required('Due date is required'),
        price: yup
          .number()
          .required('Price is required')
          .min(1, 'Price must be greater than 0')
      })
    )
    .min(1, 'At least one deliverable is required'),
  budget: yup
    .number()
    .required('Budget is required')
    .min(100, 'Budget must be at least $100'),
  startDate: yup
    .date()
    .required('Start date is required'),
  endDate: yup
    .date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date must be after start date'),
  termsAndConditions: yup
    .string()
    .optional()
    .max(3000, 'Terms and conditions cannot exceed 3000 characters')
});

// Deliverable submission validation schema
export const deliverableSchema = yup.object({
  deliverableId: yup
    .string()
    .required('Deliverable ID is required')
    .uuid('Invalid deliverable ID'),
  contentUrl: yup
    .string()
    .required('Content URL is required')
    .test('valid-url', 'Please enter a valid URL', validateUrl),
  contentId: yup
    .string()
    .optional(),
  notes: yup
    .string()
    .optional()
    .max(500, 'Notes cannot exceed 500 characters')
});

// Media kit validation schema
export const mediaKitSchema = yup.object({
  template: yup
    .string()
    .required('Template is required'),
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  bio: yup
    .string()
    .required('Bio is required')
    .max(1000, 'Bio cannot exceed 1000 characters'),
  categories: yup
    .array()
    .of(yup.string())
    .min(1, 'Please select at least one category'),
  photo: yup
    .string()
    .optional(),
  contact: yup
    .string()
    .optional()
    .email('Please enter a valid email address'),
  includedPlatforms: yup
    .array()
    .of(yup.string())
    .min(1, 'Please select at least one platform'),
  featuredContent: yup
    .array()
    .of(yup.string())
    .optional(),
  showRateCard: yup
    .boolean()
    .optional(),
  showAudienceDemographics: yup
    .boolean()
    .optional(),
  customSections: yup
    .array()
    .of(
      yup.object({
        title: yup.string().required('Section title is required'),
        content: yup.string().required('Section content is required')
      })
    )
    .optional()
});

// Analytics filter validation schema
export const analyticsFilterSchema = yup.object({
  timeframe: yup
    .object({
      start: yup.date().required('Start date is required'),
      end: yup.date().required('End date is required')
    })
    .required('Timeframe is required'),
  platforms: yup
    .array()
    .of(yup.string().oneOf(Object.values(PlatformType), 'Invalid platform type'))
    .optional(),
  contentTypes: yup
    .array()
    .of(yup.string().oneOf(Object.values(ContentType), 'Invalid content type'))
    .optional(),
  metrics: yup
    .array()
    .of(yup.string())
    .optional()
});

// Creator discovery search validation schema
export const discoverySearchSchema = yup.object({
  categories: yup
    .array()
    .of(yup.string())
    .optional(),
  platforms: yup
    .array()
    .of(yup.string().oneOf(Object.values(PlatformType), 'Invalid platform type'))
    .optional(),
  followerRange: yup
    .object({
      min: yup.number().optional().min(0, 'Minimum followers must be at least 0'),
      max: yup.number().optional().min(yup.ref('min'), 'Maximum followers must be greater than minimum')
    })
    .optional(),
  engagementRange: yup
    .object({
      min: yup.number().optional().min(0, 'Minimum engagement rate must be at least 0'),
      max: yup.number().optional().min(yup.ref('min'), 'Maximum engagement rate must be greater than minimum')
    })
    .optional(),
  audienceAge: yup
    .array()
    .of(yup.string())
    .optional(),
  audienceGender: yup
    .object({
      male: yup.boolean().optional(),
      female: yup.boolean().optional(),
      other: yup.boolean().optional()
    })
    .optional(),
  location: yup
    .array()
    .of(yup.string())
    .optional(),
  priceRange: yup
    .object({
      min: yup.number().optional().min(0, 'Minimum price must be at least 0'),
      max: yup.number().optional().min(yup.ref('min'), 'Maximum price must be greater than minimum')
    })
    .optional(),
  keywords: yup
    .array()
    .of(yup.string())
    .optional()
});