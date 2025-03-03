/**
 * Llama 3 AI Service
 * 
 * Service implementation for interacting with the containerized Llama 3 AI model,
 * providing content analysis and relationship detection capabilities. This service
 * handles communication with the self-hosted Llama model, implements retry logic,
 * error handling, and performance monitoring for all model operations.
 */

import axios, { AxiosInstance } from 'axios'; // ^1.4.0
import pTimeout from 'p-timeout'; // ^6.1.2
import pRetry from 'p-retry'; // ^5.1.2

import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { 
  MODEL_CONFIG,
  PROMPT_TEMPLATES,
  REQUEST_TIMEOUTS,
  RETRY_CONFIG,
  getModelEndpoint
} from '../../config/ai';
import { trackAiModelMetrics } from '../../monitoring/metrics';

/**
 * Interface for Llama model request
 */
interface LlamaRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
  [key: string]: any;
}

/**
 * Interface for Llama model response
 */
interface LlamaResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  [key: string]: any;
}

/**
 * Interface for content analysis options
 */
interface ContentAnalysisOptions {
  includeRawText?: boolean;
  maxTokens?: number;
  temperature?: number;
  detailedAnalysis?: boolean;
  [key: string]: any;
}

/**
 * Interface for relationship detection options
 */
interface RelationshipDetectionOptions {
  confidenceThreshold?: number;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
}

/**
 * Interface for feature extraction options
 */
interface FeatureExtractionOptions {
  maxFeatures?: number;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
}

/**
 * Interface for detected relationship
 */
interface DetectedRelationship {
  sourceContentId: string;
  targetContentId: string;
  relationshipType: string;
  confidence: number;
  justification: string;
  direction: string;
}

/**
 * Formats a prompt for the Llama model using standardized templates
 * 
 * @param templateName The name of the template to use
 * @param variables Variables to replace in the template
 * @returns Formatted prompt string
 */
export function formatPrompt(templateName: string, variables: Record<string, any>): string {
  // Get the template from the configuration
  const template = PROMPT_TEMPLATES[templateName];
  
  if (!template) {
    throw new Error(`Template "${templateName}" not found in prompt templates`);
  }
  
  // Combine system prompt with examples if available
  let promptText = template.system;
  
  // Add examples if available
  if (template.examples && template.examples.length > 0) {
    promptText += '\n\nExamples:\n';
    
    template.examples.forEach((example, index) => {
      promptText += `\nExample ${index + 1}:\n`;
      promptText += `Input: ${JSON.stringify(example.content)}\n`;
      promptText += `Output: ${JSON.stringify(example.response)}\n`;
    });
  }
  
  promptText += '\n\nNow analyze the following content:\n';
  
  // Replace variables in the prompt
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = typeof variables[key] === 'object' 
      ? JSON.stringify(variables[key], null, 2) 
      : String(variables[key]);
    
    promptText = promptText.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return promptText;
}

/**
 * Estimates the number of tokens in a text string for the Llama model
 * 
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  
  // A simple estimation based on whitespace-separated words
  // This is an approximation; production systems might use a real tokenizer
  const words = text.trim().split(/\s+/).length;
  
  // Average words to tokens ratio for Llama is roughly 0.75
  // (i.e., most words are slightly more than 1 token)
  const estimatedTokens = Math.ceil(words / 0.75);
  
  return estimatedTokens;
}

/**
 * Validates model response format and structure
 * 
 * @param response The response to validate
 * @param operationType The type of operation being performed
 * @returns True if response is valid, false otherwise
 */
function validateResponse(response: any, operationType: string): boolean {
  if (!response || !response.text) {
    logger.error({ operationType, response }, 'Invalid Llama model response: missing text');
    return false;
  }
  
  // Check if the response text can be parsed as JSON when expected
  if (['contentAnalysis', 'relationshipDetection', 'featureExtraction'].includes(operationType)) {
    try {
      // Try to parse the response as JSON
      const parsedResponse = typeof response.text === 'string' 
        ? JSON.parse(response.text) 
        : response.text;
      
      // Operation-specific validation
      switch (operationType) {
        case 'contentAnalysis':
          return !!parsedResponse.topics || !!parsedResponse.categories || !!parsedResponse.analysis;
          
        case 'relationshipDetection':
          return Array.isArray(parsedResponse) || 
                 !!parsedResponse.relationshipType || 
                 !!parsedResponse.relationships;
          
        case 'featureExtraction':
          return !!parsedResponse.features || !!parsedResponse.categories || !!parsedResponse.keywords;
          
        default:
          return true;
      }
    } catch (error) {
      logger.error({ 
        operationType, 
        error: error instanceof Error ? error.message : String(error),
        response: response.text?.substring(0, 200) + '...' // Log first 200 chars
      }, 'Failed to parse Llama model response as JSON');
      
      return false;
    }
  }
  
  // For operations that don't require JSON parsing
  return true;
}

/**
 * Service implementation for interacting with the self-hosted Llama 3 model
 */
export class LlamaService {
  private endpoint: string;
  private timeout: number;
  private retryConfig: typeof RETRY_CONFIG;
  private modelConfig: typeof MODEL_CONFIG.llama;
  private axiosInstance: AxiosInstance;
  
  /**
   * Initialize the Llama service with configuration settings
   */
  constructor() {
    // Get model endpoint from configuration
    this.endpoint = getModelEndpoint('llama');
    this.timeout = REQUEST_TIMEOUTS.llama;
    this.retryConfig = RETRY_CONFIG;
    this.modelConfig = MODEL_CONFIG.llama;
    
    // Initialize axios instance with default configuration
    this.axiosInstance = axios.create({
      baseURL: this.endpoint,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    logger.info({
      endpoint: this.endpoint,
      timeout: this.timeout,
      modelName: this.modelConfig.name
    }, 'Llama service initialized');
  }
  
  /**
   * Analyzes content using the Llama model to extract insights and features
   * 
   * @param content The content to analyze (string or object)
   * @param analysisType Type of analysis to perform (default: 'general')
   * @param options Analysis options
   * @returns Analysis results including insights and extracted features
   */
  async analyzeContent(
    content: string | Record<string, any>,
    analysisType: string = 'general',
    options: ContentAnalysisOptions = {}
  ): Promise<Record<string, any>> {
    logger.debug({ analysisType, contentType: typeof content }, 'Starting content analysis');
    
    // Format content based on type
    const contentText = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    // Select appropriate prompt template based on analysis type
    const templateName = analysisType === 'general' ? 'contentAnalysis' : `${analysisType}Analysis`;
    
    // Prepare variables for prompt template
    const promptVariables = {
      content: contentText,
      analysisType,
      options: JSON.stringify(options)
    };
    
    // Format the prompt
    const prompt = formatPrompt(templateName, promptVariables);
    
    // Track estimated token counts
    const estimatedInputTokens = countTokens(prompt);
    logger.debug({ estimatedInputTokens }, 'Estimated input tokens for content analysis');
    
    // Prepare request data
    const requestData: LlamaRequest = {
      prompt,
      max_tokens: options.maxTokens || this.modelConfig.maxOutputTokens,
      temperature: options.temperature || this.modelConfig.temperature,
      top_p: this.modelConfig.topP,
      // Add additional parameters based on options
      ...options
    };
    
    try {
      // Track metrics for this operation
      const result = await trackAiModelMetrics(
        'llama',
        'content_analysis',
        async () => {
          // Execute the request with appropriate timeout and retry logic
          return await this.executeRequest(requestData, {
            operationType: 'contentAnalysis',
            inputTokens: estimatedInputTokens
          });
        },
        {
          analysisType,
          inputTokens: estimatedInputTokens
        }
      );
      
      // Extract and parse the response
      try {
        const analysisResult = JSON.parse(result.text);
        
        // Add metadata to the response
        return {
          ...analysisResult,
          analysisType,
          modelName: 'llama-3',
          modelVersion: result.model || this.modelConfig.name,
          tokenUsage: result.usage || { 
            estimated_total: estimatedInputTokens + countTokens(result.text) 
          }
        };
      } catch (parseError) {
        // Handle parsing errors gracefully
        logger.warn({ 
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText: result.text.substring(0, 200) // First 200 chars
        }, 'Failed to parse analysis result as JSON, returning raw text');
        
        // Return a structured response even on parsing failure
        return {
          rawAnalysis: result.text,
          analysisType,
          parseError: true,
          modelName: 'llama-3',
          modelVersion: result.model || this.modelConfig.name,
          tokenUsage: result.usage || { 
            estimated_total: estimatedInputTokens + countTokens(result.text) 
          }
        };
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        analysisType,
        contentPreview: typeof content === 'string' 
          ? content.substring(0, 100) + '...' 
          : 'Object content'
      }, 'Content analysis failed');
      
      throw new ExternalServiceError(
        `Llama model content analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        'llama'
      );
    }
  }
  
  /**
   * Detects potential relationships between content items
   * 
   * @param sourceContent The source content item
   * @param potentialRelatedContent Array of potential related content items
   * @param options Detection options
   * @returns Detected relationships with confidence scores
   */
  async detectRelationships(
    sourceContent: Record<string, any>,
    potentialRelatedContent: Record<string, any>[],
    options: RelationshipDetectionOptions = {}
  ): Promise<DetectedRelationship[]> {
    logger.debug({ 
      sourceContentId: sourceContent.id || 'unknown',
      targetCount: potentialRelatedContent.length
    }, 'Starting relationship detection');
    
    // Format source content
    const sourceContentText = typeof sourceContent.content === 'string'
      ? sourceContent.content
      : JSON.stringify({
          id: sourceContent.id,
          title: sourceContent.title,
          description: sourceContent.description,
          type: sourceContent.contentType,
          platform: sourceContent.platform,
          text: sourceContent.text || sourceContent.content
        });
    
    // Format target content items
    const targetContentTexts = potentialRelatedContent.map(item => {
      return typeof item.content === 'string'
        ? item.content
        : JSON.stringify({
            id: item.id,
            title: item.title,
            description: item.description,
            type: item.contentType,
            platform: item.platform,
            text: item.text || item.content
          });
    });
    
    // Prepare variables for prompt template
    const promptVariables = {
      sourceContent: sourceContentText,
      targetContent: JSON.stringify(targetContentTexts),
      options: JSON.stringify(options)
    };
    
    // Format the prompt
    const prompt = formatPrompt('relationshipDetection', promptVariables);
    
    // Track estimated token counts
    const estimatedInputTokens = countTokens(prompt);
    logger.debug({ estimatedInputTokens }, 'Estimated input tokens for relationship detection');
    
    // Prepare request data
    const requestData: LlamaRequest = {
      prompt,
      max_tokens: options.maxTokens || this.modelConfig.maxOutputTokens,
      temperature: options.temperature || 0.3, // Lower temperature for more deterministic outputs
      top_p: 0.85,
      // Add additional parameters based on options
      ...options
    };
    
    try {
      // Track metrics for this operation
      const result = await trackAiModelMetrics(
        'llama',
        'relationship_detection',
        async () => {
          // Execute the request with appropriate timeout and retry logic
          return await this.executeRequest(requestData, {
            operationType: 'relationshipDetection',
            inputTokens: estimatedInputTokens
          });
        },
        {
          sourceContentId: sourceContent.id || 'unknown',
          targetCount: potentialRelatedContent.length,
          inputTokens: estimatedInputTokens
        }
      );
      
      // Extract and parse the response
      try {
        const parsedResult = JSON.parse(result.text);
        
        // Handle different response formats
        let relationships: DetectedRelationship[] = [];
        
        if (Array.isArray(parsedResult)) {
          // Handle array format
          relationships = parsedResult.map(rel => ({
            sourceContentId: sourceContent.id || 'unknown',
            targetContentId: rel.targetContentId || rel.targetId || 'unknown',
            relationshipType: rel.relationshipType || 'unknown',
            confidence: typeof rel.confidence === 'number' ? rel.confidence : 0.5,
            justification: rel.justification || '',
            direction: rel.direction || rel.directionality || 'unknown'
          }));
        } else if (parsedResult.relationships && Array.isArray(parsedResult.relationships)) {
          // Handle object with relationships array
          relationships = parsedResult.relationships.map(rel => ({
            sourceContentId: sourceContent.id || 'unknown',
            targetContentId: rel.targetContentId || rel.targetId || 'unknown',
            relationshipType: rel.relationshipType || 'unknown',
            confidence: typeof rel.confidence === 'number' ? rel.confidence : 0.5,
            justification: rel.justification || '',
            direction: rel.direction || rel.directionality || 'unknown'
          }));
        } else {
          // Handle single relationship object
          relationships = [{
            sourceContentId: sourceContent.id || 'unknown',
            targetContentId: parsedResult.targetContentId || parsedResult.targetId || 'unknown',
            relationshipType: parsedResult.relationshipType || 'unknown',
            confidence: typeof parsedResult.confidence === 'number' ? parsedResult.confidence : 0.5,
            justification: parsedResult.justification || '',
            direction: parsedResult.direction || parsedResult.directionality || 'unknown'
          }];
        }
        
        // Filter by confidence threshold if specified
        const confidenceThreshold = options.confidenceThreshold || 0.5;
        const filteredRelationships = relationships.filter(
          rel => rel.confidence >= confidenceThreshold
        );
        
        logger.info({
          sourceContentId: sourceContent.id || 'unknown',
          detectedRelationships: relationships.length,
          filteredRelationships: filteredRelationships.length,
          confidenceThreshold
        }, 'Relationship detection completed');
        
        return filteredRelationships;
      } catch (parseError) {
        // Handle parsing errors
        logger.warn({ 
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText: result.text.substring(0, 200) // First 200 chars
        }, 'Failed to parse relationship detection result as JSON');
        
        // Return empty array on parsing failure
        return [];
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        sourceContentId: sourceContent.id || 'unknown',
        targetCount: potentialRelatedContent.length
      }, 'Relationship detection failed');
      
      throw new ExternalServiceError(
        `Llama model relationship detection failed: ${error instanceof Error ? error.message : String(error)}`,
        'llama'
      );
    }
  }
  
  /**
   * Extracts key features from content for semantic matching
   * 
   * @param content The content to extract features from
   * @param options Extraction options
   * @returns Extracted features and categories
   */
  async extractKeyFeatures(
    content: string | Record<string, any>,
    options: FeatureExtractionOptions = {}
  ): Promise<Record<string, any>> {
    logger.debug({ contentType: typeof content }, 'Starting feature extraction');
    
    // Format content based on type
    const contentText = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    // Prepare variables for prompt template
    const promptVariables = {
      content: contentText,
      maxFeatures: options.maxFeatures || 10,
      options: JSON.stringify(options)
    };
    
    // Format the prompt
    const prompt = formatPrompt('classification', promptVariables);
    
    // Track estimated token counts
    const estimatedInputTokens = countTokens(prompt);
    logger.debug({ estimatedInputTokens }, 'Estimated input tokens for feature extraction');
    
    // Prepare request data
    const requestData: LlamaRequest = {
      prompt,
      max_tokens: options.maxTokens || this.modelConfig.maxOutputTokens,
      temperature: options.temperature || 0.3, // Lower temperature for more consistent features
      top_p: 0.85,
      // Add additional parameters based on options
      ...options
    };
    
    try {
      // Track metrics for this operation
      const result = await trackAiModelMetrics(
        'llama',
        'feature_extraction',
        async () => {
          // Execute the request with appropriate timeout and retry logic
          return await this.executeRequest(requestData, {
            operationType: 'featureExtraction',
            inputTokens: estimatedInputTokens
          });
        },
        {
          contentType: typeof content,
          inputTokens: estimatedInputTokens
        }
      );
      
      // Extract and parse the response
      try {
        const features = JSON.parse(result.text);
        
        // Add metadata to the response
        return {
          ...features,
          modelName: 'llama-3',
          modelVersion: result.model || this.modelConfig.name,
          tokenUsage: result.usage || { 
            estimated_total: estimatedInputTokens + countTokens(result.text) 
          }
        };
      } catch (parseError) {
        // Handle parsing errors
        logger.warn({ 
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText: result.text.substring(0, 200) // First 200 chars
        }, 'Failed to parse feature extraction result as JSON');
        
        // Return a structured response even on parsing failure
        return {
          rawFeatures: result.text,
          parseError: true,
          modelName: 'llama-3',
          modelVersion: result.model || this.modelConfig.name,
          tokenUsage: result.usage || { 
            estimated_total: estimatedInputTokens + countTokens(result.text) 
          }
        };
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        contentPreview: typeof content === 'string' 
          ? content.substring(0, 100) + '...' 
          : 'Object content'
      }, 'Feature extraction failed');
      
      throw new ExternalServiceError(
        `Llama model feature extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        'llama'
      );
    }
  }
  
  /**
   * Executes a request to the Llama model with retry and timeout handling
   * 
   * @param requestData The data to send to the model
   * @param options Additional options for the request
   * @returns Model response data
   */
  private async executeRequest(
    requestData: LlamaRequest,
    options: Record<string, any> = {}
  ): Promise<LlamaResponse> {
    const operationType = options.operationType || 'generic';
    const requestTimeout = options.timeout || this.timeout;
    const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
    
    logger.debug({ 
      operationType,
      requestTimeout,
      maxRetries,
      endpoint: this.endpoint
    }, 'Executing request to Llama model');
    
    try {
      // Implement retry logic with pRetry
      const response = await pRetry(
        async () => {
          // Execute the request with timeout handling using pTimeout
          const timeoutPromise = pTimeout(
            this.axiosInstance.post<LlamaResponse>('/generate', requestData),
            {
              milliseconds: requestTimeout,
              message: `Request to Llama model timed out after ${requestTimeout}ms`
            }
          );
          
          try {
            const result = await timeoutPromise;
            
            // Validate the response
            if (!validateResponse(result.data, operationType)) {
              throw new Error(`Invalid response format for operation type: ${operationType}`);
            }
            
            return result.data;
          } catch (error) {
            // Determine if the error is retryable
            const isRetryable = error instanceof Error && (
              error.message.includes('timeout') ||
              error.message.includes('network') ||
              error.message.includes('429') ||
              error.message.includes('503') ||
              (axios.isAxiosError(error) && 
                (!error.response || 
                 error.response.status >= 500 || 
                 error.response.status === 429)
              )
            );
            
            // Log the error
            logger.warn({ 
              error: error instanceof Error ? error.message : String(error),
              isRetryable,
              operationType,
              attempt: options.attempt || 1
            }, 'Llama model request failed');
            
            // Throw an abort error for non-retryable errors
            if (!isRetryable) {
              throw new pRetry.AbortError(
                error instanceof Error ? error.message : String(error)
              );
            }
            
            // Throw the original error for retry
            throw error;
          }
        },
        {
          retries: maxRetries,
          factor: 2, // Exponential backoff factor
          minTimeout: 1000, // Minimum timeout between retries (1s)
          maxTimeout: 15000, // Maximum timeout between retries (15s)
          onFailedAttempt: error => {
            // Log each failed attempt
            logger.warn({ 
              error: error.message,
              attemptNumber: error.attemptNumber,
              retriesLeft: error.retriesLeft,
              operationType
            }, 'Retrying Llama model request');
          }
        }
      );
      
      // Log success
      logger.debug({ 
        operationType, 
        responseLength: response.text ? response.text.length : 0,
        tokenUsage: response.usage
      }, 'Llama model request successful');
      
      return response;
    } catch (error) {
      // Log the final error after all retries
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        operationType,
        requestData: {
          prompt: requestData.prompt.substring(0, 100) + '...', // Truncate for logging
          max_tokens: requestData.max_tokens,
          temperature: requestData.temperature
        }
      }, 'Llama model request failed after all retries');
      
      // Throw a service error
      throw new ExternalServiceError(
        `Failed to get response from Llama model: ${error instanceof Error ? error.message : String(error)}`,
        'llama'
      );
    }
  }
  
  /**
   * Tests connectivity to the Llama model
   * 
   * @returns Connection status with metrics
   */
  async testConnection(): Promise<Record<string, any>> {
    logger.debug({ endpoint: this.endpoint }, 'Testing connection to Llama model');
    
    const startTime = Date.now();
    
    try {
      // Prepare a simple request to test connectivity
      const testRequest: LlamaRequest = {
        prompt: 'Hello, this is a connection test. Please respond with "Connection successful."',
        max_tokens: 20,
        temperature: 0.1
      };
      
      // Use a shorter timeout for health checks
      const healthCheckTimeout = Math.min(5000, this.timeout);
      
      // Execute request with short timeout
      const response = await pTimeout(
        this.axiosInstance.post<LlamaResponse>('/generate', testRequest),
        {
          milliseconds: healthCheckTimeout,
          message: `Health check timed out after ${healthCheckTimeout}ms`
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      logger.info({ 
        responseTime,
        status: response.status,
        statusText: response.statusText
      }, 'Llama model connection test successful');
      
      return {
        available: true,
        responseTime,
        endpoint: this.endpoint,
        modelName: this.modelConfig.name,
        status: 'online'
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        responseTime,
        endpoint: this.endpoint
      }, 'Llama model connection test failed');
      
      return {
        available: false,
        responseTime,
        endpoint: this.endpoint,
        modelName: this.modelConfig.name,
        status: 'offline',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export the service as the default export
export default LlamaService;