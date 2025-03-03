/**
 * Type Generation Script
 * 
 * Automatically generates TypeScript type definitions from the Prisma schema
 * and other sources to ensure type safety and consistency across the application.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { APP_CONFIG, ENVIRONMENT } from '../src/config/constants';
import { logger } from '../src/utils/logger';

// Convert callback-based fs functions to Promise-based
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

// Define paths and configuration for type generation
const TYPES_DIR = path.resolve(__dirname, '../src/types');
const PRISMA_SCHEMA_PATH = path.resolve(__dirname, '../prisma/schema.prisma');
const OUTPUT_FILE_MAP = {
  User: 'user.ts',
  Creator: 'creator.ts',
  Brand: 'brand.ts',
  Content: 'content.ts',
  Platform: 'platform.ts',
  Partnership: 'partnership.ts',
  Payment: 'payment.ts',
  Analytics: 'analytics.ts'
};

/**
 * Ensures the types directory exists, creating it if necessary
 */
async function ensureDirectoryExists(): Promise<void> {
  try {
    await access(TYPES_DIR, fs.constants.F_OK);
    logger.info(`Types directory exists: ${TYPES_DIR}`);
  } catch (error) {
    logger.info(`Creating types directory: ${TYPES_DIR}`);
    await mkdir(TYPES_DIR, { recursive: true });
    logger.info(`Types directory created: ${TYPES_DIR}`);
  }
}

/**
 * Generates TypeScript types from Prisma schema using prisma-client-js generator
 */
async function generatePrismaTypes(): Promise<void> {
  try {
    logger.info('Generating Prisma client types...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    logger.info('Prisma client types generated successfully');
  } catch (error) {
    logger.error('Error generating Prisma client types', error);
    throw error;
  }
}

/**
 * Extracts model definitions from the Prisma schema file
 * @returns Object containing parsed model definitions
 */
async function extractModelsFromSchema(): Promise<object> {
  try {
    logger.info(`Reading Prisma schema from: ${PRISMA_SCHEMA_PATH}`);
    const schemaContent = await readFile(PRISMA_SCHEMA_PATH, 'utf8');
    
    // Parse the Prisma schema to extract model definitions
    const modelRegex = /model\s+(\w+)\s+{([^}]*)}/g;
    const enumRegex = /enum\s+(\w+)\s+{([^}]*)}/g;
    
    const models: Record<string, any> = {};
    const enums: Record<string, string[]> = {};
    
    // Extract enum definitions
    let enumMatch;
    while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
      const enumName = enumMatch[1];
      const enumValues = enumMatch[2]
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'));
      
      enums[enumName] = enumValues;
    }
    
    // Extract model definitions
    let match;
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      
      // Parse model fields
      const fields: Record<string, any> = {};
      const lines = modelContent.trim().split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('//')) continue;
        
        // Parse field definition
        const fieldMatch = trimmedLine.match(/(\w+)\s+(\w+)(\?|\[\])?\s*(@\w+(\([^)]*\))?)*\s*(\/\/.*)?/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          const isOptional = fieldMatch[3] === '?';
          const isArray = fieldMatch[3] === '[]';
          
          // Skip metadata fields like @@index, @@unique, etc.
          if (fieldName.startsWith('@')) continue;
          
          fields[fieldName] = {
            name: fieldName,
            type: fieldType,
            isOptional,
            isArray,
            isEnum: enums[fieldType] !== undefined,
            originalLine: trimmedLine
          };
        }
      }
      
      models[modelName] = {
        name: modelName,
        fields
      };
    }
    
    logger.info(`Extracted ${Object.keys(models).length} models and ${Object.keys(enums).length} enums from schema`);
    
    return { models, enums };
  } catch (error) {
    logger.error('Error extracting models from schema', error);
    throw error;
  }
}

/**
 * Generates TypeScript interfaces for database models and related types
 * @param models Extracted model definitions
 * @returns Map of file paths to generated content
 */
async function generateModelTypes(models: any): Promise<Map<string, string>> {
  try {
    logger.info('Generating model type definitions...');
    const typesMap = new Map<string, string>();
    const { models: modelDefs, enums: enumDefs } = models;
    
    // Process each model and map to appropriate output file
    for (const [modelName, model] of Object.entries(modelDefs)) {
      const outputFile = OUTPUT_FILE_MAP[modelName] || `${modelName.toLowerCase()}.ts`;
      
      // Start building the type content for this model
      let typeContent = `/**
 * Type definitions for ${modelName} and related entities
 * Auto-generated from Prisma schema - do not edit directly
 */

`;
      
      // Add enum types if needed for this model
      const modelEnums = new Set<string>();
      for (const field of Object.values(model.fields)) {
        if (field.isEnum && enumDefs[field.type]) {
          modelEnums.add(field.type);
        }
      }
      
      // Generate enum definitions
      for (const enumName of modelEnums) {
        typeContent += `/**
 * ${enumName} enum for ${modelName}
 */
export enum ${enumName} {
${enumDefs[enumName].map(value => `  ${value} = "${value}"`).join(',\n')}
}

`;
      }
      
      // Generate the interface for the model
      typeContent += `/**
 * ${modelName} database model interface
 */
export interface ${modelName} {
`;
      
      // Add fields to the interface
      for (const [fieldName, field] of Object.entries(model.fields)) {
        let fieldType = field.type;
        
        // Map Prisma types to TypeScript types
        if (!field.isEnum) {
          switch (fieldType) {
            case 'String':
              fieldType = 'string';
              break;
            case 'Int':
            case 'Float':
            case 'Decimal':
              fieldType = 'number';
              break;
            case 'Boolean':
              fieldType = 'boolean';
              break;
            case 'DateTime':
              fieldType = 'Date';
              break;
            case 'Json':
              fieldType = 'Record<string, any>';
              break;
            case 'Bytes':
              fieldType = 'Buffer';
              break;
          }
        }
        
        // Handle arrays and optional fields
        if (field.isArray) {
          fieldType = `${fieldType}[]`;
        }
        if (field.isOptional) {
          fieldType = `${fieldType} | null`;
        }
        
        // Add JSDoc for the field
        typeContent += `  /**
   * ${fieldName} - ${field.originalLine.includes('//') ? field.originalLine.split('//')[1].trim() : fieldType}
   */
  ${fieldName}: ${fieldType};
`;
      }
      
      // Close the interface definition
      typeContent += `}

`;
      
      // Add create/update input types
      typeContent += `/**
 * Input type for creating a new ${modelName}
 */
export type ${modelName}CreateInput = Omit<${modelName}, 'id'> & {
  id?: string;
};

/**
 * Input type for updating an existing ${modelName}
 */
export type ${modelName}UpdateInput = Partial<${modelName}CreateInput>;

`;
      
      // Add the content to the map
      typesMap.set(outputFile, typeContent);
      logger.info(`Generated types for model: ${modelName}`);
    }
    
    return typesMap;
  } catch (error) {
    logger.error('Error generating model types', error);
    throw error;
  }
}

/**
 * Generates TypeScript types for API requests, responses, and error handling
 * @returns Generated API types content
 */
async function generateAPITypes(): Promise<string> {
  logger.info('Generating API type definitions...');
  
  return `/**
 * API Related Types
 * Auto-generated - do not edit directly
 */

/**
 * Standard API Response structure for all endpoints
 */
export interface APIResponse<T = any> {
  /**
   * Status of the response
   */
  success: boolean;
  
  /**
   * Data payload for successful responses
   */
  data?: T;
  
  /**
   * Error object for failed responses
   */
  error?: APIError;
  
  /**
   * Metadata for the response
   */
  meta?: {
    /**
     * Pagination information if applicable
     */
    pagination?: PaginationMeta;
    /**
     * Additional metadata fields
     */
    [key: string]: any;
  };
}

/**
 * Standardized API Error structure
 */
export interface APIError {
  /**
   * Error code (application-specific)
   */
  code: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Optional detailed error information
   */
  details?: Record<string, any>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /**
   * Total number of items available
   */
  total: number;
  
  /**
   * Number of items per page
   */
  limit: number;
  
  /**
   * Current offset (number of items skipped)
   */
  offset: number;
  
  /**
   * Total number of pages
   */
  pages: number;
  
  /**
   * Current page number
   */
  page: number;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  /**
   * Number of items to return per page
   */
  limit?: number;
  
  /**
   * Number of items to skip
   */
  offset?: number;
  
  /**
   * Page number to retrieve
   */
  page?: number;
}

/**
 * Sorting parameters for list endpoints
 */
export interface SortingParams {
  /**
   * Field to sort by
   */
  sortBy?: string;
  
  /**
   * Sort direction (asc or desc)
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters for list endpoints
 */
export interface FilterParams {
  /**
   * Filter query string
   */
  q?: string;
  
  /**
   * Filter by field:value pairs
   */
  [key: string]: any;
}

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export type QueryParams = PaginationParams & SortingParams & FilterParams;
`;
}

/**
 * Generates additional application-specific types beyond the database models
 * @returns Map of file paths to generated content
 */
async function generateAdditionalTypes(): Promise<Map<string, string>> {
  logger.info('Generating additional application-specific types...');
  const typesMap = new Map<string, string>();
  
  // Generate analytics types
  typesMap.set('analytics.ts', `/**
 * Analytics Type Definitions
 * Auto-generated - do not edit directly
 */

/**
 * Standardized metrics across platforms
 */
export interface StandardizedMetrics {
  /**
   * Total views/impressions
   */
  views: number;
  
  /**
   * Total engagements (likes, comments, shares, etc.)
   */
  engagements: number;
  
  /**
   * Engagement rate as a percentage
   */
  engagementRate: number;
  
  /**
   * Total shares/reposts
   */
  shares: number;
  
  /**
   * Total comments
   */
  comments: number;
  
  /**
   * Total likes/reactions
   */
  likes: number;
  
  /**
   * Total watch time in seconds (for video content)
   */
  watchTimeSeconds?: number;
  
  /**
   * Average view duration in seconds (for video content)
   */
  avgViewDurationSeconds?: number;
  
  /**
   * Click-through rate as a percentage
   */
  clickThroughRate?: number;
  
  /**
   * Estimated content value in USD
   */
  estimatedValueUSD?: number;
}

/**
 * Time period for metrics aggregation
 */
export enum MetricPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL_TIME = 'all_time',
  CUSTOM = 'custom'
}

/**
 * Daily metrics data point
 */
export interface DailyMetricsDataPoint {
  /**
   * Date for the metrics
   */
  date: string;
  
  /**
   * Metrics data
   */
  metrics: StandardizedMetrics;
}

/**
 * Audience demographics data
 */
export interface AudienceDemographics {
  /**
   * Age distribution by percentage
   */
  ageRanges: {
    /**
     * Age range
     */
    range: string;
    
    /**
     * Percentage of audience in this range
     */
    percentage: number;
  }[];
  
  /**
   * Gender distribution by percentage
   */
  genderDistribution: {
    /**
     * Gender category
     */
    gender: string;
    
    /**
     * Percentage of audience of this gender
     */
    percentage: number;
  }[];
  
  /**
   * Geographic distribution by country/region
   */
  geoDistribution: {
    /**
     * Country or region name
     */
    location: string;
    
    /**
     * Percentage of audience from this location
     */
    percentage: number;
  }[];
  
  /**
   * Interests distribution
   */
  interestCategories: {
    /**
     * Interest category name
     */
    category: string;
    
    /**
     * Percentage of audience with this interest
     */
    percentage: number;
  }[];
}

/**
 * Aggregated metrics for content family
 */
export interface ContentFamilyMetrics {
  /**
   * Root content ID
   */
  rootContentId: string;
  
  /**
   * Total metrics across all related content
   */
  totalMetrics: StandardizedMetrics;
  
  /**
   * Metrics broken down by platform
   */
  platformBreakdown: {
    /**
     * Platform name
     */
    platform: string;
    
    /**
     * Metrics for this platform
     */
    metrics: StandardizedMetrics;
    
    /**
     * Percentage of total metrics from this platform
     */
    percentage: number;
  }[];
  
  /**
   * Performance trends
   */
  trends: {
    /**
     * Trend direction
     */
    direction: 'up' | 'down' | 'stable';
    
    /**
     * Percentage change
     */
    percentageChange: number;
    
    /**
     * Period for trend calculation
     */
    period: MetricPeriod;
  };
}

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboardData {
  /**
   * Summary metrics
   */
  summary: StandardizedMetrics;
  
  /**
   * Time series data for charts
   */
  timeSeries: DailyMetricsDataPoint[];
  
  /**
   * Platform breakdown data
   */
  platforms: {
    /**
     * Platform name
     */
    platform: string;
    
    /**
     * Metrics for this platform
     */
    metrics: StandardizedMetrics;
    
    /**
     * Percentage of total metrics from this platform
     */
    percentage: number;
  }[];
  
  /**
   * Content performance data
   */
  topContent: {
    /**
     * Content ID
     */
    contentId: string;
    
    /**
     * Content title
     */
    title: string;
    
    /**
     * Content platform
     */
    platform: string;
    
    /**
     * Metrics for this content
     */
    metrics: StandardizedMetrics;
  }[];
  
  /**
   * Audience data
   */
  audience: AudienceDemographics;
}
`);

  // Generate content relationship mapping types
  typesMap.set('content-mapping.ts', `/**
 * Content Relationship Mapping Type Definitions
 * Auto-generated - do not edit directly
 */

/**
 * Relationship type between content items
 */
export enum RelationshipType {
  /**
   * Parent-child relationship (primary)
   */
  PARENT_CHILD = 'PARENT_CHILD',
  
  /**
   * Content derived from another piece
   */
  DERIVATIVE = 'DERIVATIVE',
  
  /**
   * Content repurposed from another piece
   */
  REPURPOSED = 'REPURPOSED',
  
  /**
   * Content reaction to another piece
   */
  REACTION = 'REACTION',
  
  /**
   * Content referencing another piece
   */
  REFERENCE = 'REFERENCE'
}

/**
 * Content relationship node for graph visualization
 */
export interface ContentNode {
  /**
   * Unique identifier for the node
   */
  id: string;
  
  /**
   * Content ID
   */
  contentId: string;
  
  /**
   * Display title
   */
  title: string;
  
  /**
   * Platform identifier
   */
  platform: string;
  
  /**
   * URL to content
   */
  url: string;
  
  /**
   * Thumbnail image URL
   */
  thumbnail?: string;
  
  /**
   * Published date
   */
  publishedAt: string;
  
  /**
   * Key metrics
   */
  metrics: {
    views: number;
    engagements: number;
  };
  
  /**
   * Node type (root, child, etc.)
   */
  nodeType: 'root' | 'child' | 'leaf';
  
  /**
   * Hierarchical path
   */
  path: string;
  
  /**
   * Depth in the hierarchy
   */
  depth: number;
}

/**
 * Relationship edge for graph visualization
 */
export interface RelationshipEdge {
  /**
   * Unique identifier for the edge
   */
  id: string;
  
  /**
   * Source node ID
   */
  source: string;
  
  /**
   * Target node ID
   */
  target: string;
  
  /**
   * Relationship type
   */
  type: RelationshipType;
  
  /**
   * Confidence score of the relationship (0-1)
   */
  confidence: number;
}

/**
 * Content family graph for visualization
 */
export interface ContentFamilyGraph {
  /**
   * Root content ID
   */
  rootId: string;
  
  /**
   * Nodes in the graph
   */
  nodes: ContentNode[];
  
  /**
   * Edges in the graph
   */
  edges: RelationshipEdge[];
  
  /**
   * Metadata about the graph
   */
  metadata: {
    /**
     * Total number of nodes
     */
    totalNodes: number;
    
    /**
     * Maximum depth of the graph
     */
    maxDepth: number;
    
    /**
     * Created date
     */
    createdAt: string;
    
    /**
     * Last updated date
     */
    updatedAt: string;
  };
}

/**
 * Creation method for content relationships
 */
export enum CreationMethod {
  /**
   * Automatically detected by the system
   */
  SYSTEM_DETECTED = 'SYSTEM_DETECTED',
  
  /**
   * Suggested by AI and confirmed by user
   */
  AI_SUGGESTED = 'AI_SUGGESTED',
  
  /**
   * Manually defined by the user
   */
  USER_DEFINED = 'USER_DEFINED',
  
  /**
   * Linked by the platform metadata
   */
  PLATFORM_LINKED = 'PLATFORM_LINKED'
}

/**
 * Content relationship suggestion from AI
 */
export interface RelationshipSuggestion {
  /**
   * Source content ID
   */
  sourceContentId: string;
  
  /**
   * Target content ID
   */
  targetContentId: string;
  
  /**
   * Suggested relationship type
   */
  relationshipType: RelationshipType;
  
  /**
   * Confidence score (0-1)
   */
  confidence: number;
  
  /**
   * Reasoning for the suggestion
   */
  reasoning: string;
  
  /**
   * Suggestion status
   */
  status: 'pending' | 'accepted' | 'rejected';
}
`);

  // Generate partnership workflow types
  typesMap.set('partnership.ts', `/**
 * Partnership Workflow Type Definitions
 * Auto-generated - do not edit directly
 */

/**
 * Partnership status in the workflow
 */
export enum PartnershipStatus {
  /**
   * Initial contact or discussion phase
   */
  INITIAL = 'INITIAL',
  
  /**
   * Proposal has been sent
   */
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  
  /**
   * Proposal has been received
   */
  PROPOSAL_RECEIVED = 'PROPOSAL_RECEIVED',
  
  /**
   * Negotiation is in progress
   */
  NEGOTIATION = 'NEGOTIATION',
  
  /**
   * Contract has been sent
   */
  CONTRACT_SENT = 'CONTRACT_SENT',
  
  /**
   * Contract has been signed by all parties
   */
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  
  /**
   * Work is in progress
   */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /**
   * Content is under review
   */
  REVIEW = 'REVIEW',
  
  /**
   * Revisions have been requested
   */
  REVISIONS = 'REVISIONS',
  
  /**
   * Partnership has been completed
   */
  COMPLETED = 'COMPLETED',
  
  /**
   * Partnership has been cancelled
   */
  CANCELLED = 'CANCELLED'
}

/**
 * Contract status in the workflow
 */
export enum ContractStatus {
  /**
   * Contract is being drafted
   */
  DRAFTING = 'DRAFTING',
  
  /**
   * Contract has been sent
   */
  SENT = 'SENT',
  
  /**
   * Contract has been viewed
   */
  VIEWED = 'VIEWED',
  
  /**
   * Contract has been signed by creator
   */
  SIGNED_CREATOR = 'SIGNED_CREATOR',
  
  /**
   * Contract has been signed by brand
   */
  SIGNED_BRAND = 'SIGNED_BRAND',
  
  /**
   * Contract has been signed by all parties
   */
  SIGNED_ALL = 'SIGNED_ALL',
  
  /**
   * Contract has been cancelled
   */
  CANCELLED = 'CANCELLED',
  
  /**
   * Contract has expired
   */
  EXPIRED = 'EXPIRED'
}

/**
 * Payment status in the workflow
 */
export enum PaymentStatus {
  /**
   * Payment is pending
   */
  PENDING = 'PENDING',
  
  /**
   * Payment is being processed
   */
  PROCESSING = 'PROCESSING',
  
  /**
   * Payment is in escrow
   */
  IN_ESCROW = 'IN_ESCROW',
  
  /**
   * Payment has been released
   */
  RELEASED = 'RELEASED',
  
  /**
   * Payment has been completed
   */
  COMPLETED = 'COMPLETED',
  
  /**
   * Payment has failed
   */
  FAILED = 'FAILED',
  
  /**
   * Payment has been refunded
   */
  REFUNDED = 'REFUNDED',
  
  /**
   * Payment is in dispute
   */
  DISPUTED = 'DISPUTED'
}

/**
 * Deliverable item in a partnership
 */
export interface Deliverable {
  /**
   * Unique identifier
   */
  id: string;
  
  /**
   * Partnership ID
   */
  partnershipId: string;
  
  /**
   * Deliverable title
   */
  title: string;
  
  /**
   * Detailed description
   */
  description: string;
  
  /**
   * Platform for the deliverable
   */
  platform: string;
  
  /**
   * Content type
   */
  contentType: string;
  
  /**
   * Due date
   */
  dueDate: string;
  
  /**
   * Status of the deliverable
   */
  status: 'not_started' | 'in_progress' | 'submitted' | 'revision_requested' | 'approved';
  
  /**
   * URL to the delivered content
   */
  contentUrl?: string;
  
  /**
   * Notes or feedback
   */
  notes?: string;
}

/**
 * Partnership proposal details
 */
export interface PartnershipProposal {
  /**
   * Unique identifier
   */
  id: string;
  
  /**
   * Brand ID
   */
  brandId: string;
  
  /**
   * Creator ID
   */
  creatorId: string;
  
  /**
   * Campaign name
   */
  campaignName: string;
  
  /**
   * Campaign brief
   */
  brief: string;
  
  /**
   * Start date
   */
  startDate: string;
  
  /**
   * End date
   */
  endDate: string;
  
  /**
   * Deliverables list
   */
  deliverables: Deliverable[];
  
  /**
   * Budget amount
   */
  budget: number;
  
  /**
   * Currency code
   */
  currency: string;
  
  /**
   * Additional terms and conditions
   */
  terms?: string;
  
  /**
   * Proposal status
   */
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'countered';
  
  /**
   * Created date
   */
  createdAt: string;
  
  /**
   * Last updated date
   */
  updatedAt: string;
}

/**
 * Payment milestone for partnerships
 */
export interface PaymentMilestone {
  /**
   * Unique identifier
   */
  id: string;
  
  /**
   * Partnership ID
   */
  partnershipId: string;
  
  /**
   * Milestone name
   */
  name: string;
  
  /**
   * Milestone description
   */
  description: string;
  
  /**
   * Amount for this milestone
   */
  amount: number;
  
  /**
   * Due date
   */
  dueDate: string;
  
  /**
   * Milestone status
   */
  status: 'pending' | 'in_escrow' | 'released' | 'completed';
  
  /**
   * Release condition
   */
  releaseCondition: 'manual' | 'deadline' | 'deliverable_approved';
}
`);

  return typesMap;
}

/**
 * Writes generated type content to appropriate files
 * @param typesMap Map of file paths to generated content
 */
async function writeTypesToFiles(typesMap: Map<string, string>): Promise<void> {
  try {
    logger.info('Writing generated types to files...');
    const typeFiles: string[] = [];
    
    for (const [fileName, content] of typesMap.entries()) {
      const filePath = path.join(TYPES_DIR, fileName);
      await writeFile(filePath, content, 'utf8');
      typeFiles.push(fileName);
      logger.info(`Generated type file: ${filePath}`);
    }
    
    // Generate index file
    await generateIndexFile(typeFiles);
  } catch (error) {
    logger.error('Error writing types to files', error);
    throw error;
  }
}

/**
 * Generates an index.ts file that exports all type definitions
 * @param typeFiles Array of type file names
 */
async function generateIndexFile(typeFiles: string[]): Promise<void> {
  try {
    logger.info('Generating index file for type exports...');
    
    let indexContent = `/**
 * Type Definitions Index
 * Auto-generated - do not edit directly
 */

`;
    
    // Add imports and exports for each type file
    for (const file of typeFiles) {
      const basename = path.basename(file, '.ts');
      indexContent += `import * as ${basename}Types from './${basename}';\n`;
    }
    
    indexContent += '\n';
    
    // Export all type modules
    for (const file of typeFiles) {
      const basename = path.basename(file, '.ts');
      indexContent += `export { ${basename}Types };\n`;
    }
    
    // Add specific type exports for convenience
    indexContent += `
// Re-export common types for convenience
`;
    
    // Add specific imports based on development vs. production
    if (ENVIRONMENT === 'development') {
      indexContent += `
// Development-only type utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type MockType<T> = {
  [P in keyof T]: jest.Mock<any, any>;
};
`;
    }
    
    // Write the index file
    const indexPath = path.join(TYPES_DIR, 'index.ts');
    await writeFile(indexPath, indexContent, 'utf8');
    
    logger.info(`Generated types index file: ${indexPath}`);
  } catch (error) {
    logger.error('Error generating index file', error);
    throw error;
  }
}

/**
 * Main function that orchestrates the type generation process
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting type generation process...');
    
    // Ensure the types directory exists
    await ensureDirectoryExists();
    
    // Generate Prisma client types
    await generatePrismaTypes();
    
    // Extract models from schema
    const models = await extractModelsFromSchema();
    
    // Generate model types
    const modelTypes = await generateModelTypes(models);
    
    // Generate API types
    const apiTypes = await generateAPITypes();
    modelTypes.set('api.ts', apiTypes);
    
    // Generate additional types
    const additionalTypes = await generateAdditionalTypes();
    
    // Combine all type maps
    const allTypes = new Map([...modelTypes, ...additionalTypes]);
    
    // Write types to files
    await writeTypesToFiles(allTypes);
    
    logger.info('Type generation completed successfully');
  } catch (error) {
    logger.error('Type generation failed', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in type generation script', error);
  process.exit(1);
});