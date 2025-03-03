import * as yup from 'yup'; // v1.2.0
import { Request } from 'express'; // v4.18.2
import { ValidationError } from './errors';
import { logger } from './logger';
import { 
  UserTypes, 
  CreatorTypes, 
  BrandTypes, 
  ContentTypes, 
  PlatformTypes, 
  PartnershipTypes,
  PaymentTypes
} from '../types';

/**
 * Validates data against a Yup schema and returns validated data or throws ValidationError
 * @param data Data to validate
 * @param schema Yup schema to validate against
 * @param options Validation options
 * @returns Validated and transformed data
 */
export const validateSchema = async (
  data: any, 
  schema: yup.Schema, 
  options: { abortEarly?: boolean; stripUnknown?: boolean } = {}
): Promise<any> => {
  try {
    // Set default options
    const validationOptions = {
      abortEarly: false,
      stripUnknown: true,
      ...options
    };
    
    // Validate data against schema
    const validatedData = await schema.validate(data, validationOptions);
    return validatedData;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      // Format validation errors into a structured object
      const validationErrors = error.inner.reduce((errors, err) => {
        if (err.path) {
          errors[err.path] = err.message;
        } else {
          errors._global = errors._global || [];
          errors._global.push(err.message);
        }
        return errors;
      }, {} as Record<string, any>);
      
      // Log validation failure with details
      logger.debug(`Validation failed for data: ${JSON.stringify(data)}. Errors: ${JSON.stringify(validationErrors)}`);
      
      // Throw ValidationError with formatted validation errors
      throw new ValidationError('Validation failed', validationErrors);
    }
    
    // Rethrow unknown errors
    throw error;
  }
};

/**
 * Extracts and validates data from an Express request against a schema
 * @param req Express request object
 * @param source Source of data in the request ('body', 'query', 'params')
 * @param schema Yup schema to validate against
 * @returns Validated request data
 */
export const validateRequest = async (
  req: Request, 
  source: string, 
  schema: yup.Schema
): Promise<any> => {
  const data = 
    source === 'body' ? req.body : 
    source === 'query' ? req.query : 
    source === 'params' ? req.params : 
    req.body;
  
  return validateSchema(data, schema);
};

/**
 * Sanitizes input data to prevent XSS and injection attacks
 * @param input Data to sanitize
 * @returns Sanitized data
 */
export const sanitizeInput = (input: any): any => {
  if (input == null) {
    return input;
  }
  
  // Handle different input types
  if (typeof input === 'string') {
    // Sanitize string by removing script tags, HTML tags, and control characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[^\x20-\x7E\x0A\x0D\xA0-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, '');
  } else if (Array.isArray(input)) {
    // Recursively sanitize array elements
    return input.map(item => sanitizeInput(item));
  } else if (typeof input === 'object') {
    // Recursively sanitize object properties
    const sanitized: Record<string, any> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  
  // Return primitive values unchanged
  return input;
};

// Common validation schemas

/**
 * Schema for validating email format
 */
export const emailSchema = yup
  .string()
  .email('Please enter a valid email address')
  .required('Email is required')
  .max(255, 'Email must be less than 255 characters');

/**
 * Schema for validating password requirements
 */
export const passwordSchema = yup
  .string()
  .required('Password is required')
  .min(10, 'Password must be at least 10 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  )
  .max(128, 'Password must be less than 128 characters');

/**
 * Schema for login validation
 */
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Password is required')
});

/**
 * Schema for registration validation
 */
export const registerSchema = yup.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: yup.string().required('Full name is required').max(100, 'Full name must be less than 100 characters'),
  userType: yup
    .string()
    .oneOf(
      Object.values(UserTypes.UserType),
      'User type must be one of: ' + Object.values(UserTypes.UserType).join(', ')
    )
    .required('User type is required')
});

/**
 * Creates validation schema for user data with customizable options
 * @param options Options to customize the schema
 * @returns Yup schema for user validation
 */
export const createUserSchema = (
  options: {
    isUpdate?: boolean;
    includePassword?: boolean;
    includeUserType?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    includePassword: true,
    includeUserType: true,
    ...options
  };
  
  // Start with base schema
  let schema = yup.object({
    fullName: yup.string().max(100, 'Full name must be less than 100 characters')
  });
  
  // Add email validation
  if (opts.isUpdate) {
    schema = schema.shape({
      email: emailSchema.notRequired()
    });
  } else {
    schema = schema.shape({
      email: emailSchema
    });
  }
  
  // Add password validation if required
  if (opts.includePassword) {
    if (opts.isUpdate) {
      schema = schema.shape({
        password: passwordSchema.notRequired()
      });
    } else {
      schema = schema.shape({
        password: passwordSchema
      });
    }
  }
  
  // Add user type validation if required
  if (opts.includeUserType) {
    if (opts.isUpdate) {
      schema = schema.shape({
        userType: yup
          .string()
          .oneOf(
            Object.values(UserTypes.UserType),
            'User type must be one of: ' + Object.values(UserTypes.UserType).join(', ')
          )
          .notRequired()
      });
    } else {
      schema = schema.shape({
        userType: yup
          .string()
          .oneOf(
            Object.values(UserTypes.UserType),
            'User type must be one of: ' + Object.values(UserTypes.UserType).join(', ')
          )
          .required('User type is required')
      });
    }
  }
  
  return schema;
};

/**
 * Creates validation schema for creator data with customizable options
 * @param options Options to customize the schema
 * @returns Yup schema for creator validation
 */
export const createCreatorSchema = (
  options: {
    isUpdate?: boolean;
    includeUserData?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    includeUserData: false,
    ...options
  };
  
  // Base creator schema
  let schema = yup.object({
    bio: yup.string().max(2000, 'Bio must be less than 2000 characters'),
    categories: yup
      .array()
      .of(
        yup
          .string()
          .oneOf(
            Object.values(CreatorTypes.Category),
            'Category must be one of: ' + Object.values(CreatorTypes.Category).join(', ')
          )
      )
      .min(1, 'At least one category is required'),
    profileImage: yup.string().url('Profile image must be a valid URL'),
    location: yup.string().max(100, 'Location must be less than 100 characters'),
    languages: yup.array().of(yup.string()),
    website: yup.string().url('Website must be a valid URL').max(255, 'Website URL must be less than 255 characters')
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      bio: yup.string().required('Bio is required').max(2000, 'Bio must be less than 2000 characters'),
      categories: yup
        .array()
        .of(
          yup
            .string()
            .oneOf(
              Object.values(CreatorTypes.Category),
              'Category must be one of: ' + Object.values(CreatorTypes.Category).join(', ')
            )
        )
        .min(1, 'At least one category is required')
        .required('Categories are required')
    });
  }
  
  // Include user data if requested
  if (opts.includeUserData) {
    const userSchema = createUserSchema({ isUpdate: opts.isUpdate });
    schema = schema.concat(userSchema);
  }
  
  return schema;
};

/**
 * Creates validation schema for brand data with customizable options
 * @param options Options to customize the schema
 * @returns Yup schema for brand validation
 */
export const createBrandSchema = (
  options: {
    isUpdate?: boolean;
    includeUserData?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    includeUserData: false,
    ...options
  };
  
  // Base brand schema
  let schema = yup.object({
    companyName: yup.string().max(100, 'Company name must be less than 100 characters'),
    industries: yup
      .array()
      .of(
        yup
          .string()
          .oneOf(
            Object.values(BrandTypes.Industry),
            'Industry must be one of: ' + Object.values(BrandTypes.Industry).join(', ')
          )
      ),
    logoImage: yup.string().url('Logo image must be a valid URL'),
    websiteUrl: yup.string().url('Website must be a valid URL').max(255, 'Website URL must be less than 255 characters'),
    description: yup.string().max(2000, 'Description must be less than 2000 characters'),
    location: yup.string().max(100, 'Location must be less than 100 characters')
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      companyName: yup.string().required('Company name is required').max(100, 'Company name must be less than 100 characters'),
      industries: yup
        .array()
        .of(
          yup
            .string()
            .oneOf(
              Object.values(BrandTypes.Industry),
              'Industry must be one of: ' + Object.values(BrandTypes.Industry).join(', ')
            )
        )
        .min(1, 'At least one industry is required')
        .required('Industries are required'),
      websiteUrl: yup
        .string()
        .url('Website must be a valid URL')
        .max(255, 'Website URL must be less than 255 characters')
        .required('Website URL is required')
    });
  }
  
  // Include user data if requested
  if (opts.includeUserData) {
    const userSchema = createUserSchema({ isUpdate: opts.isUpdate });
    schema = schema.concat(userSchema);
  }
  
  return schema;
};

/**
 * Creates validation schema for content data with customizable options
 * @param options Options to customize the schema
 * @returns Yup schema for content validation
 */
export const createContentSchema = (
  options: {
    isUpdate?: boolean;
    contentType?: ContentTypes.ContentType;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    ...options
  };
  
  // Base content schema
  let schema = yup.object({
    title: yup.string().max(255, 'Title must be less than 255 characters'),
    description: yup.string().max(5000, 'Description must be less than 5000 characters'),
    contentType: yup
      .string()
      .oneOf(
        Object.values(ContentTypes.ContentType),
        'Content type must be one of: ' + Object.values(ContentTypes.ContentType).join(', ')
      ),
    platformId: yup.string().uuid('Platform ID must be a valid UUID'),
    externalId: yup.string().max(255, 'External ID must be less than 255 characters'),
    url: yup.string().url('URL must be a valid URL').max(2083, 'URL must be less than 2083 characters'),
    thumbnail: yup.string().url('Thumbnail must be a valid URL'),
    publishedAt: yup.date(),
    metadata: yup.object()
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      title: yup.string().required('Title is required').max(255, 'Title must be less than 255 characters'),
      contentType: yup
        .string()
        .oneOf(
          Object.values(ContentTypes.ContentType),
          'Content type must be one of: ' + Object.values(ContentTypes.ContentType).join(', ')
        )
        .required('Content type is required'),
      platformId: yup.string().uuid('Platform ID must be a valid UUID').required('Platform ID is required'),
      externalId: yup.string().required('External ID is required').max(255, 'External ID must be less than 255 characters'),
      url: yup
        .string()
        .url('URL must be a valid URL')
        .max(2083, 'URL must be less than 2083 characters')
        .required('URL is required')
    });
  }
  
  // Add specific validations based on content type
  if (opts.contentType) {
    switch (opts.contentType) {
      case ContentTypes.ContentType.VIDEO:
      case ContentTypes.ContentType.SHORT_VIDEO:
        schema = schema.shape({
          metadata: yup.object({
            duration: yup.number().positive('Duration must be positive'),
            resolution: yup.string(),
            aspectRatio: yup.string()
          })
        });
        break;
      
      case ContentTypes.ContentType.PHOTO:
      case ContentTypes.ContentType.CAROUSEL:
        schema = schema.shape({
          metadata: yup.object({
            resolution: yup.string(),
            imageCount: yup.number().when('contentType', {
              is: ContentTypes.ContentType.CAROUSEL,
              then: yup.number().min(2, 'Carousel must contain at least 2 images').required('Image count is required for carousel')
            })
          })
        });
        break;
        
      case ContentTypes.ContentType.PODCAST:
        schema = schema.shape({
          metadata: yup.object({
            duration: yup.number().positive('Duration must be positive').required('Duration is required for podcasts'),
            episodeNumber: yup.number(),
            season: yup.number()
          })
        });
        break;
    }
  }
  
  return schema;
};

/**
 * Creates validation schema for content relationship data
 * @param options Options to customize the schema
 * @returns Yup schema for content relationship validation
 */
export const createContentRelationshipSchema = (
  options: {
    isUpdate?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    ...options
  };
  
  // Base relationship schema
  let schema = yup.object({
    sourceContentId: yup.string().uuid('Source content ID must be a valid UUID'),
    targetContentId: yup.string().uuid('Target content ID must be a valid UUID'),
    relationshipType: yup
      .string()
      .oneOf(
        Object.values(ContentTypes.RelationshipType),
        'Relationship type must be one of: ' + Object.values(ContentTypes.RelationshipType).join(', ')
      ),
    confidence: yup.number().min(0, 'Confidence must be at least 0').max(1, 'Confidence must be at most 1'),
    creationMethod: yup
      .string()
      .oneOf(
        Object.values(ContentTypes.CreationMethod),
        'Creation method must be one of: ' + Object.values(ContentTypes.CreationMethod).join(', ')
      ),
    metadata: yup.object()
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      sourceContentId: yup.string().uuid('Source content ID must be a valid UUID').required('Source content ID is required'),
      targetContentId: yup.string().uuid('Target content ID must be a valid UUID').required('Target content ID is required'),
      relationshipType: yup
        .string()
        .oneOf(
          Object.values(ContentTypes.RelationshipType),
          'Relationship type must be one of: ' + Object.values(ContentTypes.RelationshipType).join(', ')
        )
        .required('Relationship type is required')
    });
  }
  
  // Validate that source and target are not the same
  schema = schema.test(
    'not-same-content',
    'Source content ID and target content ID cannot be the same',
    function (value) {
      if (value.sourceContentId && value.targetContentId && value.sourceContentId === value.targetContentId) {
        return this.createError({
          path: 'targetContentId',
          message: 'Source content ID and target content ID cannot be the same'
        });
      }
      return true;
    }
  );
  
  return schema;
};

/**
 * Creates validation schema for platform connection data
 * @param options Options to customize the schema
 * @returns Yup schema for platform validation
 */
export const createPlatformSchema = (
  options: {
    isUpdate?: boolean;
    platformType?: PlatformTypes.PlatformType;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    ...options
  };
  
  // Base platform schema
  let schema = yup.object({
    creatorId: yup.string().uuid('Creator ID must be a valid UUID'),
    platformType: yup
      .string()
      .oneOf(
        Object.values(PlatformTypes.PlatformType),
        'Platform type must be one of: ' + Object.values(PlatformTypes.PlatformType).join(', ')
      ),
    handle: yup.string().max(100, 'Handle must be less than 100 characters'),
    url: yup.string().url('URL must be a valid URL').max(2083, 'URL must be less than 2083 characters'),
    authStatus: yup
      .string()
      .oneOf(
        Object.values(PlatformTypes.AuthStatus),
        'Auth status must be one of: ' + Object.values(PlatformTypes.AuthStatus).join(', ')
      ),
    metadata: yup.object()
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      creatorId: yup.string().uuid('Creator ID must be a valid UUID').required('Creator ID is required'),
      platformType: yup
        .string()
        .oneOf(
          Object.values(PlatformTypes.PlatformType),
          'Platform type must be one of: ' + Object.values(PlatformTypes.PlatformType).join(', ')
        )
        .required('Platform type is required'),
      handle: yup.string().required('Handle is required').max(100, 'Handle must be less than 100 characters'),
      url: yup
        .string()
        .url('URL must be a valid URL')
        .max(2083, 'URL must be less than 2083 characters')
        .required('URL is required')
    });
  }
  
  // Add platform-specific validations
  if (opts.platformType) {
    switch (opts.platformType) {
      case PlatformTypes.PlatformType.YOUTUBE:
        schema = schema.shape({
          handle: yup
            .string()
            .matches(
              /^[a-zA-Z0-9_-]{1,100}$/,
              'YouTube handle must only contain letters, numbers, underscores, and hyphens'
            )
        });
        break;
        
      case PlatformTypes.PlatformType.INSTAGRAM:
        schema = schema.shape({
          handle: yup
            .string()
            .matches(
              /^[a-zA-Z0-9._]{1,30}$/,
              'Instagram handle must only contain letters, numbers, periods, and underscores'
            )
            .max(30, 'Instagram handle must be less than 30 characters')
        });
        break;
        
      case PlatformTypes.PlatformType.TIKTOK:
        schema = schema.shape({
          handle: yup
            .string()
            .matches(
              /^[a-zA-Z0-9._]{1,24}$/,
              'TikTok handle must only contain letters, numbers, periods, and underscores'
            )
            .max(24, 'TikTok handle must be less than 24 characters')
        });
        break;
        
      case PlatformTypes.PlatformType.TWITTER:
        schema = schema.shape({
          handle: yup
            .string()
            .matches(
              /^[a-zA-Z0-9_]{1,15}$/,
              'Twitter handle must only contain letters, numbers, and underscores'
            )
            .max(15, 'Twitter handle must be less than 15 characters')
        });
        break;
    }
  }
  
  return schema;
};

/**
 * Creates validation schema for partnership data between creators and brands
 * @param options Options to customize the schema
 * @returns Yup schema for partnership validation
 */
export const createPartnershipSchema = (
  options: {
    isUpdate?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    ...options
  };
  
  // Base partnership schema
  let schema = yup.object({
    creatorId: yup.string().uuid('Creator ID must be a valid UUID'),
    brandId: yup.string().uuid('Brand ID must be a valid UUID'),
    campaignId: yup.string().uuid('Campaign ID must be a valid UUID'),
    title: yup.string().max(255, 'Title must be less than 255 characters'),
    description: yup.string().max(5000, 'Description must be less than 5000 characters'),
    budget: yup.number().positive('Budget must be positive').min(100, 'Budget must be at least 100'),
    currency: yup.string().length(3, 'Currency must be a 3-letter code'),
    startDate: yup.date(),
    endDate: yup.date(),
    status: yup
      .string()
      .oneOf(
        Object.values(PartnershipTypes.PartnershipStatus),
        'Status must be one of: ' + Object.values(PartnershipTypes.PartnershipStatus).join(', ')
      ),
    isPublic: yup.boolean(),
    metadata: yup.object()
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      creatorId: yup.string().uuid('Creator ID must be a valid UUID').required('Creator ID is required'),
      brandId: yup.string().uuid('Brand ID must be a valid UUID').required('Brand ID is required'),
      title: yup.string().required('Title is required').max(255, 'Title must be less than 255 characters'),
      budget: yup
        .number()
        .positive('Budget must be positive')
        .min(100, 'Budget must be at least 100')
        .required('Budget is required'),
      currency: yup.string().length(3, 'Currency must be a 3-letter code').required('Currency is required'),
      startDate: yup.date().required('Start date is required'),
      endDate: yup.date().required('End date is required')
    });
  }
  
  // Validate that end date is after start date
  schema = schema.test(
    'end-date-after-start-date',
    'End date must be after start date',
    function (value) {
      if (value.startDate && value.endDate && new Date(value.startDate) >= new Date(value.endDate)) {
        return this.createError({
          path: 'endDate',
          message: 'End date must be after start date'
        });
      }
      return true;
    }
  );
  
  return schema;
};

/**
 * Creates validation schema for payment transaction data
 * @param options Options to customize the schema
 * @returns Yup schema for payment validation
 */
export const createPaymentSchema = (
  options: {
    isUpdate?: boolean;
  } = {}
): yup.Schema => {
  // Default options
  const opts = {
    isUpdate: false,
    ...options
  };
  
  // Base payment schema
  let schema = yup.object({
    partnershipId: yup.string().uuid('Partnership ID must be a valid UUID'),
    milestoneId: yup.string().uuid('Milestone ID must be a valid UUID'),
    senderId: yup.string().uuid('Sender ID must be a valid UUID'),
    recipientId: yup.string().uuid('Recipient ID must be a valid UUID'),
    amount: yup.number().positive('Amount must be positive'),
    currency: yup.string().length(3, 'Currency must be a 3-letter code'),
    type: yup
      .string()
      .oneOf(
        Object.values(PaymentTypes.PaymentType),
        'Payment type must be one of: ' + Object.values(PaymentTypes.PaymentType).join(', ')
      ),
    status: yup
      .string()
      .oneOf(
        Object.values(PaymentTypes.PaymentStatus),
        'Payment status must be one of: ' + Object.values(PaymentTypes.PaymentStatus).join(', ')
      ),
    paymentMethodId: yup.string().uuid('Payment method ID must be a valid UUID'),
    description: yup.string().max(500, 'Description must be less than 500 characters'),
    inEscrow: yup.boolean(),
    metadata: yup.object()
  });
  
  // Add required validation for non-update schemas
  if (!opts.isUpdate) {
    schema = schema.shape({
      partnershipId: yup.string().uuid('Partnership ID must be a valid UUID').required('Partnership ID is required'),
      senderId: yup.string().uuid('Sender ID must be a valid UUID').required('Sender ID is required'),
      recipientId: yup.string().uuid('Recipient ID must be a valid UUID').required('Recipient ID is required'),
      amount: yup.number().positive('Amount must be positive').required('Amount is required'),
      currency: yup.string().length(3, 'Currency must be a 3-letter code').required('Currency is required'),
      type: yup
        .string()
        .oneOf(
          Object.values(PaymentTypes.PaymentType),
          'Payment type must be one of: ' + Object.values(PaymentTypes.PaymentType).join(', ')
        )
        .required('Payment type is required')
    });
  }
  
  // Validate that sender and recipient are not the same
  schema = schema.test(
    'different-sender-recipient',
    'Sender and recipient cannot be the same',
    function (value) {
      if (value.senderId && value.recipientId && value.senderId === value.recipientId) {
        return this.createError({
          path: 'recipientId',
          message: 'Sender and recipient cannot be the same'
        });
      }
      return true;
    }
  );
  
  return schema;
};

// Export all schemas and validation functions
export const schemas = {
  userSchema: createUserSchema,
  creatorSchema: createCreatorSchema,
  brandSchema: createBrandSchema,
  contentSchema: createContentSchema,
  contentRelationshipSchema: createContentRelationshipSchema,
  platformSchema: createPlatformSchema,
  partnershipSchema: createPartnershipSchema,
  paymentSchema: createPaymentSchema
};

export {
  validateSchema,
  validateRequest,
  sanitizeInput,
  schemas,
  loginSchema,
  registerSchema,
  emailSchema,
  passwordSchema
};