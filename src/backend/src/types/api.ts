/**
 * API Types
 * 
 * This module defines common TypeScript interfaces and types for API request/response patterns,
 * pagination, filtering, sorting, and error handling used throughout the Engagerr backend.
 * 
 * These types ensure consistent API design and data structures across all endpoints.
 */

/**
 * Standard pagination parameters for API requests
 */
export interface PaginationParams {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Optional offset-based pagination (alternative to page) */
  offset?: number;
  /** Optional limit-based pagination (alternative to pageSize) */
  limit?: number;
}

/**
 * Standard response structure for paginated data
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;
    /** Number of items per page */
    pageSize: number;
    /** Total number of items across all pages */
    totalItems: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page available */
    hasNextPage: boolean;
    /** Whether there is a previous page available */
    hasPreviousPage: boolean;
  };
  /** Additional metadata about the response */
  meta: {
    /** Timestamp of when the response was generated */
    timestamp: string;
    /** Additional context-specific metadata */
    [key: string]: any;
  };
}

/**
 * Sort direction options
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Parameters for sorting API results
 */
export interface SortParams {
  /** Field name to sort by */
  field: string;
  /** Sort direction */
  direction: SortDirection;
}

/**
 * Filter operators for building query conditions
 */
export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between'
}

/**
 * Structure for individual filter conditions in API requests
 */
export interface FilterCondition {
  /** Field name to filter on */
  field: string;
  /** Filter operator to apply */
  operator: FilterOperator;
  /** Value to compare against (type depends on operator) */
  value: any;
}

/**
 * Parameters for filtering API results with complex conditions
 */
export interface FilterParams {
  /** Array of filter conditions */
  conditions: FilterCondition[];
  /** Logical operator to combine conditions ('AND' or 'OR') */
  logicalOperator: 'AND' | 'OR';
}

/**
 * Standardized error codes for API responses
 */
export enum ApiErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}

/**
 * Structure for individual validation errors
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Machine-readable error code */
  code: string;
}

/**
 * Container for multiple validation errors
 */
export interface ValidationErrors {
  /** Array of validation errors */
  errors: ValidationError[];
}

/**
 * Standard error response structure for API errors
 */
export interface ApiErrorResponse {
  /** Error code */
  code: ApiErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
  /** Request path that triggered the error */
  path: string;
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Validation errors, if applicable */
  validationErrors?: ValidationErrors;
}

/**
 * Standard wrapper for successful API responses
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** Additional metadata about the response */
  meta: {
    /** ISO timestamp when the response was generated */
    timestamp: string;
    /** Additional context-specific metadata */
    [key: string]: any;
  };
}

/**
 * Common date range parameters for time-based queries
 */
export interface DateRangeParams {
  /** Start date in ISO format */
  startDate: string;
  /** End date in ISO format */
  endDate: string;
  /** Optional timezone identifier */
  timeZone?: string;
}

/**
 * Parameters for text search functionality
 */
export interface SearchParams {
  /** Search query string */
  query: string;
  /** Fields to search within */
  fields: string[];
}

/**
 * Parameters for specifying related resources to include in response
 */
export interface IncludeParams {
  /** Array of relation paths to include */
  include: string[];
}

/**
 * Namespace containing all API-related types
 */
export namespace ApiTypes {
  export type { 
    PaginationParams,
    PaginatedResponse,
    SortParams,
    FilterCondition,
    FilterParams,
    ApiErrorResponse, 
    ApiResponse,
    ValidationError,
    ValidationErrors,
    DateRangeParams,
    SearchParams,
    IncludeParams
  };
  
  export { 
    SortDirection,
    FilterOperator,
    ApiErrorCode
  };
}