/**
 * Mistral AI Service
 * 
 * Implements a client for the Mistral language model containerized API, 
 * providing efficient classification and initial matching capabilities.
 * Optimized for lower resource requirements compared to larger models.
 */

import axios from 'axios'; // ^1.4.0
import rax from 'retry-axios'; // ^2.6.0
import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { 
  MODEL_CONFIG, 
  getModelEndpoint, 
  PROMPT_TEMPLATES 
} from '../../config/ai';
import { 
  trackAiModelMetrics,
  trackSlaMetrics 
} from '../../monitoring/metrics';

// Cache the endpoint to avoid repeated lookups
let MISTRAL_ENDPOINT: string | null = null;

/**
 * Formats a request for the Mistral API with appropriate parameters
 * @param params Parameters to include in the prompt
 * @param templateName Name of the template to use
 * @returns Formatted request object
 */
function formatRequest(params: Record<string, any>, templateName: string): Record<string, any> {
  if (!params) {
    throw new Error('Request parameters are required');
  }

  // Get the appropriate prompt template
  const template = PROMPT_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  // Format the system prompt
  let systemPrompt = template.system;
  
  // Replace any template variables in the system prompt
  Object.keys(params).forEach(key => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    systemPrompt = systemPrompt.replace(regex, params[key]);
  });

  // Construct the request body
  const request = {
    model: MODEL_CONFIG.mistral.name,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: params.content || params.query || JSON.stringify(params)
      }
    ],
    temperature: params.temperature || MODEL_CONFIG.mistral.temperature,
    max_tokens: params.max_tokens || MODEL_CONFIG.mistral.maxOutputTokens,
    top_p: params.top_p || MODEL_CONFIG.mistral.topP,
    stream: false,
    format: params.format || 'json'
  };

  return request;
}

/**
 * Parses the response from the Mistral API
 * @param response Raw response from API
 * @param outputFormat Expected output format
 * @returns Parsed and formatted response
 */
function parseResponse(response: any, outputFormat: string = 'json'): any {
  // Extract the raw text from the response
  const rawText = response?.choices?.[0]?.message?.content || response?.text || '';
  
  // If JSON output is expected, try to parse it
  if (outputFormat === 'json') {
    try {
      // Handle case where the model returns the JSON with markdown code blocks
      let jsonText = rawText.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/```$/, '');
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error),
        rawText: rawText.substring(0, 200) // Include part of the raw text for debugging
      }, 'Failed to parse JSON from Mistral response');
      
      // Return raw text if JSON parsing fails
      return { text: rawText, parseError: true };
    }
  }
  
  // Return raw text for non-JSON responses
  return rawText;
}

/**
 * Makes a request to the Mistral API with error handling and retries
 * @param requestBody Request body to send to the API
 * @param options Additional options
 * @returns API response
 */
async function makeRequest(
  requestBody: Record<string, any>,
  options: Record<string, any> = {}
): Promise<any> {
  // Ensure we have the endpoint URL
  if (!MISTRAL_ENDPOINT) {
    try {
      MISTRAL_ENDPOINT = getModelEndpoint('mistral');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get Mistral endpoint');
      throw new ExternalServiceError('Failed to get Mistral endpoint', 'MistralAI');
    }
  }

  // Set up request options
  const timeout = options.timeout || MODEL_CONFIG.mistral.timeout || 20000;
  const retries = options.retries || 2;
  
  // Configure axios with retry capabilities
  const axiosInstance = axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Initialize retry-axios
  const raxConfig = {
    retry: retries,
    retryDelay: 1000,
    httpMethodsToRetry: ['POST', 'GET'],
    statusCodesToRetry: [[408, 429, 500, 502, 503, 504]],
    backoffType: 'exponential',
    onRetryAttempt: (err: any) => {
      const cfg = rax.getConfig(err);
      logger.warn({
        error: err.message,
        attempt: cfg?.currentRetryAttempt,
        endpoint: MISTRAL_ENDPOINT
      }, `Retrying Mistral API request (${cfg?.currentRetryAttempt}/${retries})`);
    }
  };
  
  const raxId = rax.attach(axiosInstance);
  
  try {
    const startTime = Date.now();
    
    // Make the request to the Mistral API
    const response = await axiosInstance.post(
      MISTRAL_ENDPOINT,
      requestBody,
      {
        raxConfig,
        headers: {
          'X-Request-ID': options.requestId || `mistral-${Date.now()}`
        }
      }
    );
    
    const duration = Date.now() - startTime;
    
    // Check for valid response
    if (!response.data) {
      throw new Error('Empty response from Mistral API');
    }
    
    // Log success and timing
    logger.debug({
      endpoint: MISTRAL_ENDPOINT,
      duration,
      operation: options.operation || 'inference'
    }, 'Mistral API request successful');
    
    // Track latency for metrics
    trackSlaMetrics(
      'mistral',
      'inference_latency',
      duration,
      { warning: 1000, critical: 5000 }
    );
    
    return response.data;
  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      // Get response data if available
      const responseData = error.response?.data;
      const statusCode = error.response?.status;
      
      logger.error({
        error: error.message,
        statusCode,
        responseData,
        endpoint: MISTRAL_ENDPOINT,
        request: {
          // Avoid logging sensitive data
          model: requestBody.model,
          temperature: requestBody.temperature,
          max_tokens: requestBody.max_tokens
        }
      }, 'Mistral API request failed');
      
      // Check for rate limiting
      if (statusCode === 429) {
        throw new ExternalServiceError('Mistral API rate limit exceeded', 'MistralAI');
      }
      
      // Check for timeout
      if (error.code === 'ECONNABORTED') {
        throw new ExternalServiceError('Mistral API request timed out', 'MistralAI');
      }
      
      throw new ExternalServiceError(`Mistral API request failed: ${error.message}`, 'MistralAI');
    }
    
    // Handle non-axios errors
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      endpoint: MISTRAL_ENDPOINT
    }, 'Unexpected error in Mistral API request');
    
    throw new ExternalServiceError('Unexpected error in Mistral API request', 'MistralAI');
  }
}

/**
 * Classifies content into predefined categories
 * @param content Content to classify (string or object)
 * @param categories Categories to consider
 * @param options Additional options
 * @returns Classification results with confidence scores
 */
async function classifyContent(
  content: string | Record<string, any>,
  categories: string[],
  options: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Validate content
  if (!content) {
    throw new Error('Content is required for classification');
  }
  
  // Validate categories
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    throw new Error('Categories array is required for classification');
  }
  
  // Format content to text if it's an object
  const contentText = typeof content === 'string' 
    ? content 
    : JSON.stringify(content);
  
  // Prepare request using classification template
  const requestBody = formatRequest({
    content: contentText,
    categories: categories.join(', '),
    format: options.format || 'json'
  }, 'classification');
  
  // Track metrics for AI model usage
  return await trackAiModelMetrics(
    'mistral',
    'classification',
    async () => {
      try {
        // Make request to Mistral API
        const response = await makeRequest(requestBody, {
          operation: 'classification',
          timeout: options.timeout,
          retries: options.retries,
          requestId: options.requestId
        });
        
        // Parse and return the classification result
        const result = parseResponse(response, options.format || 'json');
        
        // Add metadata about the operation
        return {
          ...result,
          _meta: {
            model: 'mistral',
            operation: 'classification',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error),
          operation: 'classification'
        }, 'Content classification failed');
        
        throw error;
      }
    },
    {
      inputTokens: Math.ceil(contentText.length / 4), // Rough estimate of input tokens
      categories: categories.length
    }
  );
}

/**
 * Assigns standardized taxonomy categories to content
 * @param content Content to analyze
 * @param taxonomyConfig Taxonomy configuration
 * @param options Additional options
 * @returns Taxonomy assignments with confidence levels
 */
async function assignTaxonomy(
  content: string | Record<string, any>,
  taxonomyConfig: Record<string, any>,
  options: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Validate content
  if (!content) {
    throw new Error('Content is required for taxonomy assignment');
  }
  
  // Validate taxonomy config
  if (!taxonomyConfig || typeof taxonomyConfig !== 'object') {
    throw new Error('Taxonomy configuration is required');
  }
  
  // Format content to text if it's an object
  const contentText = typeof content === 'string' 
    ? content 
    : JSON.stringify(content);
  
  // Format taxonomy configuration for the prompt
  const taxonomyString = JSON.stringify(taxonomyConfig);
  
  // Prepare request using taxonomy template
  const requestBody = formatRequest({
    content: contentText,
    taxonomy: taxonomyString,
    format: options.format || 'json'
  }, 'classification');
  
  // Track metrics for AI model usage
  return await trackAiModelMetrics(
    'mistral',
    'taxonomy',
    async () => {
      try {
        // Make request to Mistral API
        const response = await makeRequest(requestBody, {
          operation: 'taxonomy',
          timeout: options.timeout,
          retries: options.retries,
          requestId: options.requestId
        });
        
        // Parse and return the taxonomy assignment result
        const result = parseResponse(response, options.format || 'json');
        
        // Add metadata about the operation
        return {
          ...result,
          _meta: {
            model: 'mistral',
            operation: 'taxonomy',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error),
          operation: 'taxonomy'
        }, 'Taxonomy assignment failed');
        
        throw error;
      }
    },
    {
      inputTokens: Math.ceil(contentText.length / 4), // Rough estimate of input tokens
      taxonomySize: Object.keys(taxonomyConfig).length
    }
  );
}

/**
 * Evaluates compatibility between creator profiles and brand requirements
 * @param creatorProfile Creator profile information
 * @param brandRequirements Brand requirements and preferences
 * @param options Additional options
 * @returns Match results with scores and explanations
 */
async function matchCreatorToBrand(
  creatorProfile: Record<string, any>,
  brandRequirements: Record<string, any>,
  options: Record<string, any> = {}
): Promise<Record<string, any>> {
  // Validate creator profile
  if (!creatorProfile || typeof creatorProfile !== 'object') {
    throw new Error('Creator profile is required for matching');
  }
  
  // Validate brand requirements
  if (!brandRequirements || typeof brandRequirements !== 'object') {
    throw new Error('Brand requirements are required for matching');
  }
  
  // Extract relevant creator metrics and categories
  const creatorData = {
    name: creatorProfile.name,
    categories: creatorProfile.categories || [],
    metrics: {
      followers: creatorProfile.followers || creatorProfile.totalFollowers,
      engagement: creatorProfile.engagementRate,
      contentTypes: creatorProfile.contentTypes || []
    },
    // Include only non-sensitive profile data
    profile: {
      bio: creatorProfile.bio,
      platforms: creatorProfile.platforms,
      topics: creatorProfile.topics || creatorProfile.categories
    }
  };
  
  // Format brand requirements
  const brandData = {
    name: brandRequirements.name,
    industry: brandRequirements.industry || brandRequirements.categories,
    requirements: {
      audienceMatch: brandRequirements.audienceRequirements,
      contentTypes: brandRequirements.contentTypes,
      values: brandRequirements.values || []
    },
    preferences: brandRequirements.preferences || {}
  };
  
  // Prepare request body
  const requestBody = formatRequest({
    creator: JSON.stringify(creatorData),
    brand: JSON.stringify(brandData),
    format: options.format || 'json'
  }, 'classification'); // Use classification template as base
  
  // Track metrics for AI model usage
  return await trackAiModelMetrics(
    'mistral',
    'creator_brand_matching',
    async () => {
      try {
        // Make request to Mistral API
        const response = await makeRequest(requestBody, {
          operation: 'creator_brand_matching',
          timeout: options.timeout,
          retries: options.retries,
          requestId: options.requestId
        });
        
        // Parse and return the matching result
        const result = parseResponse(response, options.format || 'json');
        
        // Add metadata about the operation
        return {
          ...result,
          _meta: {
            model: 'mistral',
            operation: 'creator_brand_matching',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : String(error),
          operation: 'creator_brand_matching'
        }, 'Creator-brand matching failed');
        
        throw error;
      }
    },
    {
      inputTokens: Math.ceil((JSON.stringify(creatorData).length + JSON.stringify(brandData).length) / 4)
    }
  );
}

/**
 * Service class for interacting with the Mistral model API
 */
class MistralService {
  private endpoint: string;
  private config: Record<string, any>;
  private axiosInstance: any;
  private templates: Record<string, any>;
  
  /**
   * Initializes the Mistral service
   */
  constructor() {
    try {
      // Get the endpoint from configuration
      this.endpoint = getModelEndpoint('mistral');
      
      // Load Mistral configuration
      this.config = MODEL_CONFIG.mistral;
      
      // Load prompt templates
      this.templates = PROMPT_TEMPLATES;
      
      // Configure axios instance with retries
      this.axiosInstance = axios.create({
        baseURL: this.endpoint,
        timeout: this.config.timeout || 20000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Add retry capability
      rax.attach(this.axiosInstance);
      
      // Update the global endpoint cache
      MISTRAL_ENDPOINT = this.endpoint;
      
      logger.info({
        endpoint: this.endpoint,
        model: this.config.name
      }, 'Mistral service initialized');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to initialize Mistral service');
      
      throw new Error('Failed to initialize Mistral service');
    }
  }
  
  /**
   * Classifies content into predefined categories
   * @param content Content to classify
   * @param categories Categories to consider
   * @param options Additional options
   * @returns Classification results with confidence scores
   */
  public async classifyContent(
    content: string | Record<string, any>,
    categories: string[],
    options: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    return classifyContent(content, categories, options);
  }
  
  /**
   * Assigns standardized taxonomy categories to content
   * @param content Content to analyze
   * @param taxonomyConfig Taxonomy configuration
   * @param options Additional options
   * @returns Taxonomy assignments with confidence levels
   */
  public async assignTaxonomy(
    content: string | Record<string, any>,
    taxonomyConfig: Record<string, any>,
    options: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    return assignTaxonomy(content, taxonomyConfig, options);
  }
  
  /**
   * Evaluates compatibility between creator profiles and brand requirements
   * @param creatorProfile Creator profile information
   * @param brandRequirements Brand requirements and preferences
   * @param options Additional options
   * @returns Match results with scores and explanations
   */
  public async matchCreatorToBrand(
    creatorProfile: Record<string, any>,
    brandRequirements: Record<string, any>,
    options: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    return matchCreatorToBrand(creatorProfile, brandRequirements, options);
  }
  
  /**
   * Tests the connection to the Mistral API
   * @returns True if connection successful, false otherwise
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Prepare a minimal request to test connectivity
      const testRequest = {
        model: this.config.name,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 5
      };
      
      // Make a request with a short timeout
      await this.axiosInstance.post('/', testRequest, {
        timeout: 5000
      });
      
      logger.info('Mistral API connection test successful');
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.endpoint
      }, 'Mistral API connection test failed');
      
      return false;
    }
  }
  
  /**
   * Retrieves performance metrics for the Mistral model
   * @returns Performance metrics object
   */
  public async getMetrics(): Promise<Record<string, any>> {
    try {
      // Try to get metrics from the Mistral API if available
      const response = await this.axiosInstance.get('/metrics', {
        timeout: 5000
      });
      
      return response.data;
    } catch (error) {
      // Metrics endpoint might not be available, return basic info
      return {
        model: this.config.name,
        endpoint: this.endpoint,
        status: 'active',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export the service class as default export
export default MistralService;

// Export individual functions for direct use
export {
  classifyContent,
  matchCreatorToBrand,
  assignTaxonomy
};