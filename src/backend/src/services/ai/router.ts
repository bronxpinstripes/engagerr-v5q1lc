/**
 * AI Router Service
 * 
 * Implements the AI Router component that intelligently directs tasks to the appropriate AI model based on task type,
 * content requirements, and system conditions. This central service orchestrates Engagerr's multi-model AI architecture,
 * handling model selection, fallback logic, performance monitoring, and graceful degradation.
 */

import DeepSeekService from './deepseek'; // DeepSeek API service for general language tasks and creative generation
import LlamaService from './llama'; // Self-hosted Llama 3 model service for content analysis and relationship detection
import MistralService from './mistral'; // Self-hosted Mistral model service for classification tasks
import ClipService from './clip'; // Integration with CLIP/BLIP for visual content analysis
import { aiConfig, logger, ExternalServiceError } from '../../config/ai'; // Configuration for AI model selection rules and fallback chains
import { trackAiModelMetrics } from '../../monitoring/metrics'; // Track performance metrics for AI model operations

/**
 * Analyzes a request to determine the appropriate AI task type
 * @param request 
 * @returns The classified task type from TASK_TYPES
 */
export function classifyTask(request: any): string {
  // Examine request content, parameters, and metadata
  // Check for presence of image data to identify visual tasks
  // Analyze request structure and parameters to determine task category
  // Return the appropriate task type constant from TASK_TYPES
  
  // Placeholder implementation - replace with actual logic
  if (request.image) {
    return aiConfig.TASK_TYPES.IMAGE_ANALYSIS;
  } else if (request.content) {
    return aiConfig.TASK_TYPES.CONTENT_ANALYSIS;
  } else if (request.creative) {
    return aiConfig.TASK_TYPES.CREATIVE_GENERATION;
  } else {
    return aiConfig.TASK_TYPES.CLASSIFICATION;
  }
}

/**
 * Selects the most appropriate AI model for a given task based on configuration rules
 * @param taskType 
 * @param requestData 
 * @param options 
 * @returns The selected model identifier
 */
export function selectModelForTask(taskType: string, requestData: any, options: any): string {
  // Retrieve the model selection rules for the specified task type
  // Analyze the request data to evaluate selection criteria (content length, complexity, etc.)
  // Apply any overrides from options if present
  // Apply the selection rules to determine the appropriate model
  // Return the selected model identifier

  // Placeholder implementation - replace with actual logic
  const rules = aiConfig.MODEL_SELECTION_RULES[taskType];
  if (!rules) {
    logger.warn({ taskType }, 'No model selection rules found for task type, using default');
    return 'deepseek'; // Default model
  }

  return rules.primaryModel;
}

/**
 * Determines the fallback model for a given primary model and task type when the primary is unavailable
 * @param primaryModel 
 * @param taskType 
 * @returns Fallback model identifier or null if no fallback available
 */
export function getModelFallback(primaryModel: string, taskType: string): string | null {
  // Look up the fallback chain for the primary model from FALLBACK_CHAINS
  // Find the task-specific fallback if available
  // Use the default fallback if no task-specific fallback exists
  // Return the fallback model identifier or null if no fallback is configured

  // Placeholder implementation - replace with actual logic
  const fallbacks = aiConfig.FALLBACK_CHAINS[primaryModel];
  if (!fallbacks || !fallbacks.alternatives || fallbacks.alternatives.length === 0) {
    logger.warn({ primaryModel }, 'No fallback chain found for model');
    return null;
  }

  return fallbacks.alternatives[0]; // Return the first alternative
}

/**
 * Checks if a specified model is currently available
 * @param modelId 
 * @returns True if the model is available, false otherwise
 */
export async function checkModelAvailability(modelId: string): Promise<boolean> {
  // Get the appropriate model service instance for the specified model
  // Call the testConnection method on the service
  // Return true if the connection test is successful
  // Log and return false if the model is unavailable

  try {
    let service;
    switch (modelId) {
      case 'deepseek':
        service = new DeepSeekService();
        break;
      case 'llama':
        service = new LlamaService();
        break;
      case 'mistral':
        service = new MistralService();
        break;
      case 'clip':
        service = new ClipService();
        break;
      default:
        logger.error({ modelId }, 'Unknown model ID');
        return false;
    }

    const connectionStatus = await service.testConnection();
    return connectionStatus.status === 'connected';
  } catch (error) {
    logger.error({ modelId, error }, 'Error checking model availability');
    return false;
  }
}

/**
 * Central router service that directs AI processing tasks to the appropriate model
 */
export default class AIRouter {
  private modelServices: { [key: string]: any };
  private modelMetrics: { [key: string]: any };
  private availabilityCache: { [key: string]: { available: boolean; timestamp: number } };

  /**
   * Initializes the AI Router with service instances and configuration
   */
  constructor() {
    // Initialize model service instances (DeepSeek, Llama, Mistral, CLIP)
    this.modelServices = {
      deepseek: new DeepSeekService(),
      llama: new LlamaService(),
      mistral: new MistralService(),
      clip: new ClipService()
    };

    // Initialize model metrics tracking object
    this.modelMetrics = {};

    // Set up availability cache with TTL for each model
    this.availabilityCache = {
      deepseek: { available: false, timestamp: 0 },
      llama: { available: false, timestamp: 0 },
      mistral: { available: false, timestamp: 0 },
      clip: { available: false, timestamp: 0 }
    };

    // Load configuration from aiConfig
    // Log successful initialization of the router
    logger.info('AI Router initialized successfully');
  }

  /**
   * Routes an AI request to the appropriate model based on task classification and availability
   * @param request 
   * @param options 
   * @returns Result from the selected AI model
   */
  async routeRequest(request: any, options: any): Promise<any> {
    // Start performance tracking timer
    const startTime = Date.now();

    // Classify the task type using classifyTask
    const taskType = classifyTask(request);

    // Select the primary model using selectModelForTask
    let selectedModel = selectModelForTask(taskType, request, options);

    // Check model availability using checkModelAvailability
    let isModelAvailable = await checkModelAvailability(selectedModel);

    // If primary model is unavailable, get fallback model using getModelFallback
    if (!isModelAvailable) {
      const fallbackModel = getModelFallback(selectedModel, taskType);
      if (fallbackModel) {
        selectedModel = fallbackModel;
        isModelAvailable = await checkModelAvailability(selectedModel);
        logger.warn({ primaryModel: selectedModel, fallbackModel, taskType }, 'Primary model unavailable, using fallback');
      } else {
        logger.error({ primaryModel: selectedModel, taskType }, 'No available model found for task');
        throw new ExternalServiceError('No available AI model found for this task', 'ai_router');
      }
    }

    // If no available model found, throw ExternalServiceError
    if (!isModelAvailable) {
      logger.error({ primaryModel: selectedModel, taskType }, 'No available model found for task');
      throw new ExternalServiceError('No available AI model found for this task', 'ai_router');
    }

    // Execute the request on the selected model service with appropriate method
    let result;
    try {
      switch (selectedModel) {
        case 'deepseek':
          result = await this.modelServices.deepseek.generateText(request.prompt, options);
          break;
        case 'llama':
          result = await this.modelServices.llama.analyzeContent(request.content, taskType, options);
          break;
        case 'mistral':
          result = await this.modelServices.mistral.classifyContent(request.content, request.categories, options);
          break;
        case 'clip':
          result = await this.modelServices.clip.analyzeImage(request.image, taskType, options);
          break;
        default:
          logger.error({ selectedModel, taskType }, 'Unknown model selected');
          throw new Error(`Unknown model selected: ${selectedModel}`);
      }
    } catch (error) {
      logger.error({ selectedModel, taskType, error }, 'Error executing request on selected model');
      throw error;
    }

    // Record performance metrics using trackAiModelMetrics
    const duration = Date.now() - startTime;
    trackAiModelMetrics(selectedModel, taskType, async () => result, { duration });

    // Return the processing result
    return result;
  }

  /**
   * Specialized method for content analysis routing
   * @param content 
   * @param analysisType 
   * @param options 
   * @returns Analysis results from the selected model
   */
  async analyzeContent(content: any, analysisType: string, options: any): Promise<any> {
    // Format request with content and analysis type
    const request = { content, analysisType };

    // Route request to appropriate model using routeRequest with CONTENT_ANALYSIS task type
    return await this.routeRequest(request, { ...options, taskType: aiConfig.TASK_TYPES.CONTENT_ANALYSIS });
  }

  /**
   * Specialized method for content relationship detection routing
   * @param sourceContent 
   * @param potentialRelatedContent 
   * @param options 
   * @returns Detected relationships with confidence scores
   */
  async detectRelationships(sourceContent: any, potentialRelatedContent: any[], options: any): Promise<any> {
    // Format request with source and potential related content
    const request = { sourceContent, potentialRelatedContent };

    // Route request to appropriate model using routeRequest with RELATIONSHIP_DETECTION task type
    return await this.routeRequest(request, { ...options, taskType: aiConfig.TASK_TYPES.RELATIONSHIP_DETECTION });
  }

  /**
   * Specialized method for content classification routing
   * @param content 
   * @param classificationType 
   * @param options 
   * @returns Classification results
   */
  async classifyContent(content: any, classificationType: string, options: any): Promise<any> {
    // Format request with content and classification type
    const request = { content, classificationType };

    // Route request to appropriate model using routeRequest with CLASSIFICATION task type
    return await this.routeRequest(request, { ...options, taskType: aiConfig.TASK_TYPES.CLASSIFICATION });
  }

  /**
   * Specialized method for image analysis routing
   * @param imageData 
   * @param options 
   * @returns Image analysis results
   */
  async analyzeImage(imageData: string | Buffer, options: any): Promise<any> {
    // Format request with image data
    const request = { image: imageData };

    // Route request to appropriate model using routeRequest with IMAGE_ANALYSIS task type
    return await this.routeRequest(request, { ...options, taskType: aiConfig.TASK_TYPES.IMAGE_ANALYSIS });
  }

  /**
   * Specialized method for creative content generation routing
   * @param parameters 
   * @param options 
   * @returns Generated creative content
   */
  async generateCreativeContent(parameters: any, options: any): Promise<any> {
    // Format request with creative generation parameters
    const request = { creative: parameters };

    // Route request to appropriate model using routeRequest with CREATIVE_GENERATION task type
    return await this.routeRequest(request, { ...options, taskType: aiConfig.TASK_TYPES.CREATIVE_GENERATION });
  }

  /**
   * Retrieves performance metrics for all models
   * @returns Object containing performance metrics for each model
   */
  getModelMetrics(): object {
    // Compile metrics from tracked model performance data
    // Calculate aggregates like average response time, success rate, etc.
    // Return comprehensive metrics object

    // Placeholder implementation - replace with actual logic
    return {
      deepseek: { avgResponseTime: 0.5, successRate: 0.99 },
      llama: { avgResponseTime: 1.2, successRate: 0.95 },
      mistral: { avgResponseTime: 0.3, successRate: 0.98 },
      clip: { avgResponseTime: 0.8, successRate: 0.97 }
    };
  }

  /**
   * Gets the current availability status of all models
   * @returns Object with availability status for each model
   */
  async getModelAvailability(): Promise<object> {
    // Check cached availability status for each model
    // Update cache for any expired status by testing connections
    // Return object mapping model IDs to their availability status

    const now = Date.now();
    const availabilityPromises = Object.keys(this.availabilityCache).map(async (modelId) => {
      const cached = this.availabilityCache[modelId];
      if (now - cached.timestamp > 60000) { // 60 seconds TTL
        const available = await checkModelAvailability(modelId);
        this.availabilityCache[modelId] = { available, timestamp: now };
        logger.info({ modelId, available }, 'Refreshed model availability cache');
      }
      return { modelId, available: this.availabilityCache[modelId].available };
    });

    const availabilityResults = await Promise.all(availabilityPromises);
    return availabilityResults.reduce((acc, { modelId, available }) => {
      acc[modelId] = available;
      return acc;
    }, {});
  }

  /**
   * Refreshes the availability cache for all models
   */
  async refreshAvailabilityCache(): Promise<void> {
    // For each model service, test connection in parallel
    // Update the availability cache with fresh results
    // Log any changes in availability status
    // Update metrics with availability information

    const now = Date.now();
    const modelIds = Object.keys(this.modelServices);
    const availabilityPromises = modelIds.map(async (modelId) => {
      try {
        const available = await checkModelAvailability(modelId);
        const previousAvailability = this.availabilityCache[modelId].available;
        this.availabilityCache[modelId] = { available, timestamp: now };

        if (available !== previousAvailability) {
          logger.warn({ modelId, available, previousAvailability }, 'Model availability changed');
        }
      } catch (error) {
        logger.error({ modelId, error }, 'Error refreshing model availability');
      }
    });

    await Promise.all(availabilityPromises);
    logger.info('Model availability cache refreshed');
  }
}