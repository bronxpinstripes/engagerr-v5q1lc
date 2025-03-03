import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { AnyObjectSchema } from 'yup'; // v1.2.0
import { ZodSchema } from 'zod'; // v3.22.0
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { validateSchema, sanitizeInput } from '../utils/validation';

/**
 * Middleware function that validates the request body against a provided schema
 * @param schema Yup or Zod schema to validate against
 * @returns Express middleware function that validates the request body
 */
export const validateBody = (schema: AnyObjectSchema | ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize the request body to prevent injection attacks
      const sanitizedBody = sanitizeInput(req.body);
      
      // Validate the sanitized body against the schema
      const validatedData = await validateSchema(sanitizedBody, schema);
      
      // Update the request body with the validated data
      req.body = validatedData;
      
      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      logger.debug(`Body validation failed: ${error.message}`);
      
      // If it's already a ValidationError, pass it along
      if (error instanceof ValidationError) {
        next(error);
        return;
      }
      
      // Otherwise, create a new ValidationError
      const validationError = new ValidationError(
        'Request body validation failed',
        error.errors || { _error: error.message }
      );
      
      logger.error(`Validation error in request body: ${JSON.stringify(validationError.validationErrors)}`);
      next(validationError);
    }
  };
};

/**
 * Middleware function that validates the request query parameters against a provided schema
 * @param schema Yup or Zod schema to validate against
 * @returns Express middleware function that validates the request query parameters
 */
export const validateQuery = (schema: AnyObjectSchema | ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize the request query to prevent injection attacks
      const sanitizedQuery = sanitizeInput(req.query);
      
      // Validate the sanitized query against the schema
      const validatedData = await validateSchema(sanitizedQuery, schema);
      
      // Update the request query with the validated data
      req.query = validatedData;
      
      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      logger.debug(`Query validation failed: ${error.message}`);
      
      // If it's already a ValidationError, pass it along
      if (error instanceof ValidationError) {
        next(error);
        return;
      }
      
      // Otherwise, create a new ValidationError
      const validationError = new ValidationError(
        'Request query validation failed',
        error.errors || { _error: error.message }
      );
      
      logger.error(`Validation error in request query: ${JSON.stringify(validationError.validationErrors)}`);
      next(validationError);
    }
  };
};

/**
 * Middleware function that validates the request route parameters against a provided schema
 * @param schema Yup or Zod schema to validate against
 * @returns Express middleware function that validates the request route parameters
 */
export const validateParams = (schema: AnyObjectSchema | ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize the request params to prevent injection attacks
      const sanitizedParams = sanitizeInput(req.params);
      
      // Validate the sanitized params against the schema
      const validatedData = await validateSchema(sanitizedParams, schema);
      
      // Update the request params with the validated data
      req.params = validatedData;
      
      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      logger.debug(`Params validation failed: ${error.message}`);
      
      // If it's already a ValidationError, pass it along
      if (error instanceof ValidationError) {
        next(error);
        return;
      }
      
      // Otherwise, create a new ValidationError
      const validationError = new ValidationError(
        'Request params validation failed',
        error.errors || { _error: error.message }
      );
      
      logger.error(`Validation error in request params: ${JSON.stringify(validationError.validationErrors)}`);
      next(validationError);
    }
  };
};

/**
 * Factory function that creates a validation middleware for a specific part of the request (body, query, params)
 * @param requestPart The part of the request to validate
 * @returns Function that takes a schema and returns a middleware function
 */
const createValidationMiddleware = (requestPart: string) => {
  return (schema: AnyObjectSchema | ZodSchema<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get the data to validate from the specified request part
        const data = req[requestPart as keyof Request];
        
        // Sanitize the data to prevent injection attacks
        const sanitizedData = sanitizeInput(data);
        
        // Validate the sanitized data against the schema
        const validatedData = await validateSchema(sanitizedData, schema);
        
        // Update the request part with the validated data
        req[requestPart as keyof Request] = validatedData as any;
        
        // Proceed to the next middleware or route handler
        next();
      } catch (error) {
        logger.debug(`${requestPart} validation failed: ${error.message}`);
        
        // If it's already a ValidationError, pass it along
        if (error instanceof ValidationError) {
          next(error);
          return;
        }
        
        // Otherwise, create a new ValidationError
        const validationError = new ValidationError(
          `Request ${requestPart} validation failed`,
          error.errors || { _error: error.message }
        );
        
        logger.error(`Validation error in request ${requestPart}: ${JSON.stringify(validationError.validationErrors)}`);
        next(validationError);
      }
    };
  };
};

/**
 * A general validation middleware that validates multiple parts of a request against corresponding schemas
 * @param schemas Object with schemas for different request parts (body, query, params)
 * @returns Express middleware function that validates multiple request parts
 */
export const validateRequestSchema = (schemas: {
  body?: AnyObjectSchema | ZodSchema<any>;
  query?: AnyObjectSchema | ZodSchema<any>;
  params?: AnyObjectSchema | ZodSchema<any>;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Store validation errors
      const validationErrors: Record<string, any> = {};
      
      // Validate each part of the request if a schema is provided
      if (schemas.body) {
        try {
          const sanitizedBody = sanitizeInput(req.body);
          req.body = await validateSchema(sanitizedBody, schemas.body);
        } catch (error) {
          validationErrors.body = error instanceof ValidationError 
            ? error.validationErrors 
            : { _error: error.message || 'Validation failed' };
        }
      }
      
      if (schemas.query) {
        try {
          const sanitizedQuery = sanitizeInput(req.query);
          req.query = await validateSchema(sanitizedQuery, schemas.query);
        } catch (error) {
          validationErrors.query = error instanceof ValidationError 
            ? error.validationErrors 
            : { _error: error.message || 'Validation failed' };
        }
      }
      
      if (schemas.params) {
        try {
          const sanitizedParams = sanitizeInput(req.params);
          req.params = await validateSchema(sanitizedParams, schemas.params);
        } catch (error) {
          validationErrors.params = error instanceof ValidationError 
            ? error.validationErrors 
            : { _error: error.message || 'Validation failed' };
        }
      }
      
      // If there are any validation errors, throw a ValidationError with all of them
      if (Object.keys(validationErrors).length > 0) {
        logger.error(`Multiple validation errors: ${JSON.stringify(validationErrors)}`);
        throw new ValidationError('Request validation failed', validationErrors);
      }
      
      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // Pass the error to the next function for error handling middleware
      next(error);
    }
  };
};

export {
  validateBody,
  validateQuery,
  validateParams,
  validateRequestSchema
};