/**
 * DeepSeek AI Service Integration
 * 
 * Implements the service for integrating with the DeepSeek API within Engagerr's 
 * multi-model AI architecture. Provides natural language processing capabilities
 * for general language tasks, content analysis, and creative generation.
 */

import axios from 'axios'; // ^1.4.0
import { backOff } from 'exponential-backoff'; // ^3.1.1

import { logger } from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';
import { 
  MODEL_CONFIG, 
  MODEL_ENDPOINTS, 
  REQUEST_TIMEOUTS, 
  RETRY_CONFIG,
  PROMPT_TEMPLATES,
  getApiKey 
} from '../../config/ai';
import { trackAiModelMetrics } from '../../monitoring/metrics';

/**
 * Interface for DeepSeek service options
 */
interface DeepSeekServiceOptions {
  customEndpoint?: string;
  customApiKey?: string;
  timeout?: number;
  defaultModel?: string;
}

/**
 * Interface for text generation options
 */
interface TextGenerationOptions {
  temperature?: number;
  max_tokens?: number;
  maxTokens?: number;
  top_p?: number;
  topP?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  model?: string;
  response_format?: { type: string };
  stream?: boolean;
}

/**
 * Interface for content analysis options
 */
interface ContentAnalysisOptions extends TextGenerationOptions {
  analysisType?: string;
  structured?: boolean;
  detailLevel?: 'basic' | 'standard' | 'detailed';
}

/**
 * Interface for creative generation options
 */
interface CreativeGenerationOptions extends TextGenerationOptions {
  variations?: number;
  creativity?: 'low' | 'medium' | 'high';
  formatAsJson?: boolean;
}

/**
 * Service class for integrating with the DeepSeek API to provide AI language capabilities
 */
export default class DeepSeekService {
  private apiKey: string;
  private apiEndpoint: string;
  private modelConfig: any;
  private requestTimeout: number;
  private retryConfig: any;
  private axios: any;

  /**
   * Initializes the DeepSeek service with API credentials and configuration
   * 
   * @param options Configuration options for the service
   */
  constructor(options: DeepSeekServiceOptions = {}) {
    // Initialize with API key and endpoint from config or options
    this.apiKey = options.customApiKey || getApiKey('deepseek');
    this.apiEndpoint = options.customEndpoint || MODEL_ENDPOINTS.deepseek;
    this.modelConfig = MODEL_CONFIG.deepseek;
    this.requestTimeout = options.timeout || REQUEST_TIMEOUTS.deepseek;
    this.retryConfig = RETRY_CONFIG;
    
    // Initialize Axios instance with defaults
    this.axios = axios.create({
      baseURL: this.apiEndpoint,
      timeout: this.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    // Set up request and response interceptors for logging and tracking
    this.setupInterceptors();
    
    logger.info({
      service: 'deepseek',
      endpoint: this.apiEndpoint,
      timeoutMs: this.requestTimeout
    }, 'DeepSeek service initialized');
  }

  /**
   * Generates text completions using the DeepSeek API
   * 
   * @param prompt Text prompt for generation
   * @param options Configuration options for text generation
   * @returns Generated text completion
   */
  async generateText(prompt: string, options: TextGenerationOptions = {}): Promise<string> {
    logger.debug({
      service: 'deepseek',
      operation: 'generateText',
      promptLength: prompt.length
    }, 'Generating text with DeepSeek');
    
    // Merge provided options with defaults
    const mergedOptions = {
      temperature: 0.7,
      max_tokens: 256,
      ...options
    };
    
    // Format the request parameters
    const requestParams = this.formatRequestParameters({
      prompt,
      ...mergedOptions
    }, 'text');
    
    // Execute the request with metrics tracking
    const response = await this.executeRequest(requestParams, {
      operation: 'generateText',
      ...options
    });
    
    // Parse and return the generated text
    const parsedResponse = this.parseDeepSeekResponse(response);
    return parsedResponse.text;
  }

  /**
   * Analyzes content to extract insights like topics, sentiment, and quality assessment
   * 
   * @param content Content to analyze (string or object)
   * @param analysisType Type of analysis to perform (e.g., 'topic', 'sentiment', 'quality')
   * @param options Additional options for analysis
   * @returns Structured analysis results
   */
  async analyzeContent(
    content: string | object, 
    analysisType: string = 'general', 
    options: ContentAnalysisOptions = {}
  ): Promise<object> {
    logger.debug({
      service: 'deepseek',
      operation: 'analyzeContent',
      analysisType,
      contentType: typeof content,
      contentLength: typeof content === 'string' ? content.length : JSON.stringify(content).length
    }, 'Analyzing content with DeepSeek');
    
    // Format content for analysis
    const formattedContent = typeof content === 'string' 
      ? content 
      : JSON.stringify(content);
    
    // Generate appropriate prompt based on analysis type
    const prompt = generatePrompt('contentAnalysis', {
      content: formattedContent,
      analysisType,
      detailLevel: options.detailLevel || 'standard'
    });
    
    // Configure for structured output if requested
    const shouldUseJsonFormat = options.structured !== false;
    
    // Configure request with appropriate settings for analysis
    const requestParams = this.formatRequestParameters({
      prompt,
      temperature: options.temperature || 0.3, // Lower temperature for more consistent analysis
      max_tokens: options.max_tokens || 1024,
      response_format: shouldUseJsonFormat ? { type: 'json_object' } : undefined,
      ...options
    }, 'analysis');
    
    // Execute the request with metrics tracking
    const response = await this.executeRequest(requestParams, {
      operation: 'analyzeContent',
      analysisType,
      ...options
    });
    
    // Parse the response
    const parsedResponse = this.parseDeepSeekResponse(response);
    
    // Return the JSON object if structured, otherwise return the full response
    return shouldUseJsonFormat ? parsedResponse.json : parsedResponse;
  }

  /**
   * Generates creative content like suggestions, ideas, and variations
   * 
   * @param parameters Content parameters and requirements
   * @param options Additional options for generation
   * @returns Generated creative content
   */
  async generateCreativeContent(
    parameters: object, 
    options: CreativeGenerationOptions = {}
  ): Promise<object> {
    logger.debug({
      service: 'deepseek',
      operation: 'generateCreativeContent',
      parameterSize: JSON.stringify(parameters).length,
      creativity: options.creativity || 'medium'
    }, 'Generating creative content with DeepSeek');
    
    // Adjust temperature based on creativity level
    let temperature = options.temperature;
    if (!temperature) {
      switch (options.creativity) {
        case 'low': temperature = 0.5; break;
        case 'high': temperature = 0.9; break;
        default: temperature = 0.7; // medium
      }
    }
    
    // Configure for creative generation
    const creativeOptions = {
      temperature,
      top_p: options.top_p || options.topP || 0.95,
      max_tokens: options.max_tokens || options.maxTokens || 1024,
      ...options
    };
    
    // Generate prompt for creative content
    const prompt = generatePrompt('creativeGeneration', parameters);
    
    // Determine if response should be JSON formatted
    const shouldUseJsonFormat = options.formatAsJson !== false;
    
    // Format request parameters
    const requestParams = this.formatRequestParameters({
      prompt,
      response_format: shouldUseJsonFormat ? { type: 'json_object' } : undefined,
      ...creativeOptions
    }, 'creative');
    
    // Execute the request with metrics tracking
    const response = await this.executeRequest(requestParams, {
      operation: 'generateCreativeContent',
      ...options
    });
    
    // Parse the response
    const parsedResponse = this.parseDeepSeekResponse(response);
    
    // Return the appropriate format
    return shouldUseJsonFormat ? parsedResponse.json : parsedResponse;
  }

  /**
   * Executes a request to the DeepSeek API with retries and error handling
   * 
   * @param requestParams Parameters for the API request
   * @param options Additional options for execution
   * @returns API response data
   */
  async executeRequest(requestParams: any, options: any = {}): Promise<any> {
    // Sanitize request params for logging (remove API key)
    const sanitizedParams = { ...requestParams };
    delete sanitizedParams.apiKey;
    
    // Create correlation ID for tracking this request through logs
    const requestId = options.requestId || `deepseek-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    logger.debug({ 
      service: 'deepseek', 
      operation: options.operation || 'api_call',
      requestId,
      request: sanitizedParams 
    }, 'DeepSeek API request initiated');
    
    const startTime = Date.now();
    let attempts = 0;
    
    try {
      // Use exponential backoff for retries
      const result = await backOff(
        () => this.axios.post('/completions', requestParams),
        {
          numOfAttempts: this.retryConfig.maxRetries,
          startingDelay: this.retryConfig.initialDelay,
          timeMultiple: this.retryConfig.backoffFactor,
          maxDelay: this.retryConfig.maxDelay,
          retry: (e) => {
            attempts++;
            const retryable = this.isRetryableError(e);
            
            if (retryable) {
              logger.warn({
                service: 'deepseek',
                requestId,
                operation: options.operation || 'api_call',
                error: e.message,
                attempt: attempts,
                maxAttempts: this.retryConfig.maxRetries
              }, 'DeepSeek API retry');
            }
            
            return retryable;
          }
        }
      );
      
      const duration = Date.now() - startTime;
      
      // Track AI model metrics for monitoring
      trackAiModelMetrics(
        'deepseek',
        options.operation || 'inference',
        () => Promise.resolve(result),
        {
          duration,
          status: 'success',
          inputTokens: requestParams.messages?.reduce((total: number, msg: any) => 
            total + (msg.content?.length || 0) / 4, 0) || 0, // Rough token estimate
          outputTokens: result.data.usage?.completion_tokens || 0,
          requestId
        }
      );
      
      logger.debug({
        service: 'deepseek',
        operation: options.operation || 'api_call',
        requestId,
        duration,
        status: 'success',
        modelUsed: result.data.model,
        tokensUsed: result.data.usage
      }, 'DeepSeek API response received');
      
      return result.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track error metrics
      trackAiModelMetrics(
        'deepseek',
        options.operation || 'inference',
        () => Promise.reject(error),
        {
          duration,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          requestId
        }
      );
      
      // Log detailed error information
      logger.error({
        service: 'deepseek',
        operation: options.operation || 'api_call',
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
        attempts,
        status: 'error',
        response: (error as any)?.response?.data
      }, 'DeepSeek API error');
      
      // Throw standardized error
      throw new ExternalServiceError(
        `DeepSeek API error: ${error instanceof Error ? error.message : String(error)}`,
        'deepseek',
        { 
          requestId,
          attempts, 
          duration,
          status: (error as any)?.response?.status,
          response: (error as any)?.response?.data
        }
      );
    }
  }

  /**
   * Tests the connection to the DeepSeek API to verify service availability
   * 
   * @returns Connection test results with latency information
   */
  async testConnection(): Promise<object> {
    logger.debug({
      service: 'deepseek',
      operation: 'testConnection'
    }, 'Testing DeepSeek API connection');
    
    try {
      const testPrompt = 'Hello, this is a connection test. Please respond with "Connection successful".';
      const startTime = Date.now();
      
      // Create minimal request for testing
      const requestParams = this.formatRequestParameters({
        prompt: testPrompt,
        max_tokens: 10, // Minimal tokens for test
        temperature: 0.1  // Low temperature for consistent test response
      }, 'test');
      
      // Execute with short timeout for test
      const testAxios = axios.create({
        baseURL: this.apiEndpoint,
        timeout: 5000, // Short timeout for connection test
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      const response = await testAxios.post('/completions', requestParams);
      const duration = Date.now() - startTime;
      
      logger.info({
        service: 'deepseek',
        operation: 'testConnection',
        latency: duration,
        status: 'connected',
        model: response.data.model
      }, 'DeepSeek connection test successful');
      
      return {
        status: 'connected',
        latency: duration,
        model: response.data.model || this.modelConfig.name
      };
    } catch (error) {
      logger.error({
        service: 'deepseek',
        operation: 'testConnection',
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data
      }, 'DeepSeek connection test failed');
      
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data
      };
    }
  }

  /**
   * Check if an error should trigger a retry
   * 
   * @param error The error to check
   * @returns Boolean indicating if retry should be attempted
   */
  private isRetryableError(error: any): boolean {
    if (!error || !error.response) return true; // Network errors should be retried
    
    const status = error.response.status;
    
    // Check if status code is in the retryable list
    return this.retryConfig.retryableStatusCodes.includes(status);
  }

  /**
   * Format request parameters for the DeepSeek API
   * 
   * @param params Parameters to format
   * @param modelType Type of model/task
   * @returns Formatted request parameters
   */
  private formatRequestParameters(params: any, modelType: string): any {
    // Start with standard parameters
    const formattedParams: any = {
      model: params.model || this.modelConfig.name || 'deepseek-chat',
      temperature: params.temperature ?? this.modelConfig.temperature,
      max_tokens: params.max_tokens || params.maxTokens || this.modelConfig.maxOutputTokens,
      top_p: params.top_p ?? params.topP ?? this.modelConfig.topP,
      frequency_penalty: params.frequency_penalty ?? 0,
      presence_penalty: params.presence_penalty ?? 0,
      stream: params.stream || false,
    };
    
    // Handle prompt vs messages format
    if (params.prompt) {
      // Convert prompt to messages format
      formattedParams.messages = [
        // Add system instruction if not already defined in prompt
        { role: 'system', content: 'You are a helpful, accurate assistant.' },
        { role: 'user', content: params.prompt }
      ];
    } else if (params.messages) {
      formattedParams.messages = params.messages;
    } else {
      throw new Error('Either prompt or messages must be provided');
    }
    
    // Add response format if specified
    if (params.response_format) {
      formattedParams.response_format = params.response_format;
    }
    
    // Add any stop sequences if specified
    if (params.stop && params.stop.length > 0) {
      formattedParams.stop = params.stop;
    }
    
    // Task-specific optimizations
    switch (modelType) {
      case 'analysis':
        // Lower temperature for more deterministic analysis
        formattedParams.temperature = Math.min(formattedParams.temperature, 0.4);
        break;
      case 'creative':
        // Higher temperature for creative tasks
        formattedParams.temperature = Math.max(formattedParams.temperature, 0.7);
        break;
      case 'test':
        // Minimal settings for connection testing
        formattedParams.temperature = 0.1;
        formattedParams.max_tokens = Math.min(formattedParams.max_tokens, 20);
        break;
    }
    
    return formattedParams;
  }

  /**
   * Parse and normalize API responses
   * 
   * @param response API response to parse
   * @returns Normalized response object
   */
  private parseDeepSeekResponse(response: any): any {
    // Validate response
    if (!response || !response.choices || !response.choices.length) {
      throw new Error('Invalid DeepSeek API response format');
    }
    
    // Extract the message content
    const message = response.choices[0].message?.content || response.choices[0].text || '';
    
    // Standard response object
    const parsedResponse: any = {
      text: message,
      usage: response.usage || {},
      model: response.model,
      created: response.created,
      id: response.id
    };
    
    // If response is expected to be JSON, parse it
    if (response.response_format?.type === 'json_object' || 
        (message.trim().startsWith('{') && message.trim().endsWith('}'))) {
      try {
        parsedResponse.json = JSON.parse(message);
      } catch (e) {
        logger.warn({
          service: 'deepseek',
          error: 'Failed to parse JSON response',
          response: message.substring(0, 200) // Log a snippet of the response
        }, 'JSON parsing error in DeepSeek response');
        
        // Add the raw text so the caller can handle parsing failure
        parsedResponse.parseError = true;
      }
    }
    
    return parsedResponse;
  }

  /**
   * Set up Axios interceptors for logging and metrics
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.axios.interceptors.request.use(
      (config: any) => {
        // Remove sensitive info for logging
        const sanitizedConfig = { ...config };
        if (sanitizedConfig.headers?.Authorization) {
          sanitizedConfig.headers = { ...sanitizedConfig.headers };
          sanitizedConfig.headers.Authorization = '[REDACTED]';
        }
        
        // If there's a body with sensitive information, redact it
        if (sanitizedConfig.data) {
          const sanitizedData = { ...sanitizedConfig.data };
          if (sanitizedData.messages) {
            // Keep message structure but redact any potentially sensitive content
            sanitizedData.messages = sanitizedData.messages.map((msg: any) => ({
              ...msg,
              content: `[Content length: ${msg.content?.length || 0} chars]`
            }));
          }
          sanitizedConfig.data = sanitizedData;
        }
        
        logger.debug({
          service: 'deepseek',
          request: {
            url: sanitizedConfig.url,
            method: sanitizedConfig.method,
            contentLength: config.data ? JSON.stringify(config.data).length : 0
          }
        }, 'DeepSeek API request prepared');
        
        return config;
      },
      (error: any) => {
        logger.error({
          service: 'deepseek',
          operation: 'request',
          error: error instanceof Error ? error.message : String(error)
        }, 'DeepSeek request preparation error');
        
        return Promise.reject(error);
      }
    );
  }
}

/**
 * Parses and normalizes the response from the DeepSeek API
 * 
 * @param response API response object
 * @returns Normalized response with consistent structure
 */
export function parseDeepSeekResponse(response: any): any {
  // Validate response
  if (!response || !response.choices || !response.choices.length) {
    throw new Error('Invalid DeepSeek API response format');
  }
  
  // Extract the message content
  const message = response.choices[0].message?.content || response.choices[0].text || '';
  
  // Standard response object
  const parsedResponse: any = {
    text: message,
    usage: response.usage || {},
    model: response.model,
    created: response.created,
    id: response.id
  };
  
  // If response is expected to be JSON, parse it
  if (response.response_format?.type === 'json_object' || 
      (message.trim().startsWith('{') && message.trim().endsWith('}'))) {
    try {
      parsedResponse.json = JSON.parse(message);
    } catch (e) {
      logger.warn({
        service: 'deepseek',
        error: 'Failed to parse JSON response',
        response: message.substring(0, 200) // Log a snippet of the response
      }, 'JSON parsing error in DeepSeek response');
      
      // Add the raw text so the caller can handle parsing failure
      parsedResponse.parseError = true;
    }
  }
  
  return parsedResponse;
}

/**
 * Generates a properly formatted prompt for the DeepSeek API based on task type
 * 
 * @param taskType Type of task for prompt generation
 * @param params Parameters to include in the prompt
 * @returns Formatted prompt string
 */
export function generatePrompt(taskType: string, params: any): string {
  let template = '';
  
  // Get appropriate template based on task type
  switch (taskType) {
    case 'contentAnalysis':
      template = PROMPT_TEMPLATES.contentAnalysis.system;
      break;
    case 'relationshipDetection':
      template = PROMPT_TEMPLATES.relationshipDetection.system;
      break;
    case 'creativeGeneration':
      template = PROMPT_TEMPLATES.creativeGeneration.system;
      break;
    case 'classification':
      template = PROMPT_TEMPLATES.classification.system;
      break;
    default:
      template = 'You are a helpful AI assistant for Engagerr, a platform for content creators and brands. Analyze the provided content and provide insights.';
  }
  
  // Replace placeholders in the template if needed
  let prompt = template;
  
  // Add the content to analyze if provided
  if (params.content) {
    prompt += `\n\nContent to analyze:\n${params.content}`;
  }
  
  // Add any specific instructions based on analysis type
  if (params.analysisType && params.analysisType !== 'general') {
    prompt += `\n\nFocus specifically on ${params.analysisType} analysis.`;
  }
  
  // Add detail level guidance if specified
  if (params.detailLevel) {
    switch (params.detailLevel) {
      case 'basic':
        prompt += '\n\nProvide a basic level of analysis with key points only.';
        break;
      case 'detailed':
        prompt += '\n\nProvide a detailed, comprehensive analysis with extensive insights.';
        break;
      // 'standard' is default, no additional instructions needed
    }
  }
  
  return prompt;
}

/**
 * Validates the API response format and checks for error conditions
 * 
 * @param response API response to validate
 * @returns True if the response is valid, throws error otherwise
 */
export function validateApiResponse(response: any): boolean {
  if (!response) {
    throw new Error('Empty DeepSeek API response');
  }
  
  if (response.error) {
    throw new Error(`DeepSeek API error: ${response.error.message || JSON.stringify(response.error)}`);
  }
  
  if (!response.choices || !response.choices.length) {
    throw new Error('Invalid DeepSeek API response format: missing choices');
  }
  
  return true;
}

/**
 * Formats request parameters for the DeepSeek API according to their specifications
 * 
 * @param params Input parameters
 * @param modelType Type of model/task
 * @returns Formatted request parameters for the API
 */
export function formatRequestParameters(params: any, modelType: string): any {
  const model = params.model || MODEL_CONFIG.deepseek.name || 'deepseek-chat';
  
  const formattedParams: any = {
    model,
    messages: [],
    temperature: params.temperature ?? MODEL_CONFIG.deepseek.temperature,
    max_tokens: params.max_tokens || params.maxTokens || MODEL_CONFIG.deepseek.maxOutputTokens,
    top_p: params.top_p ?? params.topP ?? MODEL_CONFIG.deepseek.topP,
    frequency_penalty: params.frequency_penalty ?? 0,
    presence_penalty: params.presence_penalty ?? 0,
    stream: params.stream || false,
  };
  
  // Handle prompt vs messages format
  if (params.prompt) {
    // Convert prompt to messages format
    formattedParams.messages = [
      { role: 'system', content: 'You are a helpful, accurate assistant.' },
      { role: 'user', content: params.prompt }
    ];
  } else if (params.messages) {
    formattedParams.messages = params.messages;
  } else {
    throw new Error('Either prompt or messages must be provided');
  }
  
  // Add response format if specified
  if (params.response_format) {
    formattedParams.response_format = params.response_format;
  }
  
  // Add any stop sequences if specified
  if (params.stop && params.stop.length > 0) {
    formattedParams.stop = params.stop;
  }
  
  return formattedParams;
}

/**
 * Analyzes content to extract topics, sentiment, and other insights
 * 
 * @param content Content to analyze
 * @param analysisType Type of analysis to perform
 * @param options Additional options
 * @returns Analysis results with structured insights
 */
export async function analyzeContent(
  content: string | object,
  analysisType: string = 'general',
  options: ContentAnalysisOptions = {}
): Promise<object> {
  const service = new DeepSeekService();
  return await service.analyzeContent(content, analysisType, options);
}

/**
 * Generates creative content suggestions based on input parameters
 * 
 * @param parameters Content parameters and requirements
 * @param options Additional options for generation
 * @returns Generated creative content with variants
 */
export async function generateCreativeContent(
  parameters: object,
  options: CreativeGenerationOptions = {}
): Promise<object> {
  const service = new DeepSeekService();
  return await service.generateCreativeContent(parameters, options);
}

/**
 * General purpose text generation function for generic completions
 * 
 * @param prompt Text prompt for completion
 * @param options Additional generation options
 * @returns Generated text completion
 */
export async function generateText(
  prompt: string,
  options: TextGenerationOptions = {}
): Promise<string> {
  const service = new DeepSeekService();
  return await service.generateText(prompt, options);
}

/**
 * Tests the connection to the DeepSeek API with a simple request
 * 
 * @returns Connection status with latency information
 */
export async function testConnection(): Promise<object> {
  const service = new DeepSeekService();
  return await service.testConnection();
}