/**
 * AI Configuration
 * 
 * Defines Engagerr's multi-model AI architecture including:
 * - Model endpoints and specifications
 * - Task-specific model selection rules
 * - Fallback chains for resilience
 * - Performance settings like timeouts and retries
 * - Prompt templates for consistent outputs
 */

import * as dotenv from 'dotenv'; // v16.3.1
import { APP_CONFIG, ENVIRONMENT, IS_PRODUCTION } from './constants';

// Load environment variables
dotenv.config();

/**
 * Task types for AI processing
 */
export const TASK_TYPES = {
  CONTENT_ANALYSIS: 'content_analysis', // Analyzing content structure, topics, and quality
  RELATIONSHIP_DETECTION: 'relationship_detection', // Finding connections between content items
  CREATIVE_GENERATION: 'creative_generation', // Generating creative content suggestions
  CLASSIFICATION: 'classification', // Categorizing content and data
  IMAGE_ANALYSIS: 'image_analysis', // Analyzing visual content
  CREATOR_BRAND_MATCHING: 'creator_brand_matching', // Finding compatibility between creators and brands
};

/**
 * Model configuration details
 * Includes specifications, parameters, and capabilities
 */
export const MODEL_CONFIG = {
  deepseek: {
    name: 'DeepSeek Chat',
    description: 'DeepSeek's general-purpose language model for complex tasks',
    capabilities: ['text generation', 'creative content', 'complex reasoning'],
    parameters: 16,
    maxInputTokens: 8192,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 0.95,
    resourceRequirements: {
      cpu: 'moderate',
      memory: 'moderate',
      gpu: 'none', // Cloud API
    },
    costPerRequest: 'high',
    responseSpeed: 'fast',
  },
  llama: {
    name: 'Llama 3',
    description: 'Self-hosted model optimized for content analysis',
    capabilities: ['text analysis', 'relationship detection', 'classification'],
    parameters: 8,
    maxInputTokens: 4096,
    maxOutputTokens: 2048,
    temperature: 0.5,
    topP: 0.9,
    resourceRequirements: {
      cpu: 'high',
      memory: 'high',
      gpu: 'required', // Requires 1 GPU
    },
    costPerRequest: 'medium',
    responseSpeed: 'medium',
  },
  mistral: {
    name: 'Mistral',
    description: 'Self-hosted model optimized for efficient classification',
    capabilities: ['classification', 'summarization', 'simple analysis'],
    parameters: 7,
    maxInputTokens: 4096,
    maxOutputTokens: 1024,
    temperature: 0.3,
    topP: 0.85,
    resourceRequirements: {
      cpu: 'medium',
      memory: 'medium',
      gpu: 'optional', // Can run on CPU but GPU recommended
    },
    costPerRequest: 'low',
    responseSpeed: 'fast',
  },
  clip: {
    name: 'CLIP/BLIP',
    description: 'Visual content analysis model for image understanding',
    capabilities: ['image analysis', 'content classification', 'visual features'],
    parameters: 2,
    maxImageSize: '1024x1024',
    resourceRequirements: {
      cpu: 'moderate',
      memory: 'moderate',
      gpu: 'none', // Cloud API
    },
    costPerRequest: 'medium',
    responseSpeed: 'medium',
  },
};

/**
 * Model endpoints for different environments
 */
export const MODEL_ENDPOINTS = {
  // DeepSeek API endpoint
  deepseek: IS_PRODUCTION
    ? 'https://api.deepseek.com/v1'
    : process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1',

  // Self-hosted Llama endpoint
  llama: IS_PRODUCTION
    ? process.env.LLAMA_ENDPOINT || 'https://ai-services.engagerr.app/llama'
    : process.env.LLAMA_ENDPOINT || 'http://localhost:8000',

  // Self-hosted Mistral endpoint
  mistral: IS_PRODUCTION
    ? process.env.MISTRAL_ENDPOINT || 'https://ai-services.engagerr.app/mistral'
    : process.env.MISTRAL_ENDPOINT || 'http://localhost:8001',

  // Hugging Face CLIP/BLIP endpoint
  clip: IS_PRODUCTION
    ? 'https://api.inference.huggingface.co/models/clip-vit-base-patch32'
    : process.env.CLIP_API_ENDPOINT || 'https://api.inference.huggingface.co/models/clip-vit-base-patch32',
};

/**
 * Model selection rules for different task types
 * Determines which model to use based on task requirements
 */
export const MODEL_SELECTION_RULES = {
  [TASK_TYPES.CONTENT_ANALYSIS]: {
    primaryModel: 'llama',
    fallbackModel: 'deepseek',
    selectionCriteria: {
      contentLength: {
        short: 'llama', // < 1000 words
        medium: 'llama', // 1000-5000 words
        long: 'deepseek', // > 5000 words
      },
      complexity: {
        low: 'mistral',
        medium: 'llama', 
        high: 'deepseek',
      },
      priority: {
        low: 'mistral', // Batch processing, non-urgent
        medium: 'llama', // Standard processing
        high: 'deepseek', // Immediate results needed
      },
    },
    contextThreshold: 2048, // Switch to deepseek if context exceeds this token count
  },
  
  [TASK_TYPES.RELATIONSHIP_DETECTION]: {
    primaryModel: 'llama',
    fallbackModel: 'deepseek',
    selectionCriteria: {
      relationshipType: {
        direct: 'mistral', // Simple parent-child relationships
        complex: 'llama', // Multi-level hierarchies
        semantic: 'deepseek', // Content similarity without explicit links
      },
      contentVolume: {
        low: 'mistral', // < 10 items
        medium: 'llama', // 10-50 items
        high: 'deepseek', // > 50 items
      },
    },
  },
  
  [TASK_TYPES.CREATIVE_GENERATION]: {
    primaryModel: 'deepseek',
    fallbackModel: 'llama',
    selectionCriteria: {
      creativityLevel: {
        low: 'llama',
        medium: 'deepseek',
        high: 'deepseek',
      },
      responseLength: {
        short: 'llama', // Quick suggestions
        medium: 'deepseek', // Detailed ideas
        long: 'deepseek', // Comprehensive concepts
      },
    },
  },
  
  [TASK_TYPES.CLASSIFICATION]: {
    primaryModel: 'mistral',
    fallbackModel: 'llama',
    selectionCriteria: {
      categories: {
        few: 'mistral', // < 10 categories
        many: 'llama', // > 10 categories
      },
      precision: {
        low: 'mistral',
        high: 'llama',
      },
    },
  },
  
  [TASK_TYPES.IMAGE_ANALYSIS]: {
    primaryModel: 'clip',
    fallbackModel: null, // No direct fallback for image analysis
    selectionCriteria: {
      analysisDepth: {
        basic: 'clip', // Object detection, basic features
        advanced: 'clip', // Detailed visual analysis
      },
    },
  },
  
  [TASK_TYPES.CREATOR_BRAND_MATCHING]: {
    primaryModel: 'deepseek',
    fallbackModel: 'llama',
    selectionCriteria: {
      matchComplexity: {
        simple: 'llama', // Basic demographic matching
        advanced: 'deepseek', // Value alignment, style compatibility
      },
      dataVolume: {
        low: 'llama',
        high: 'deepseek',
      },
    },
  },
};

/**
 * Fallback chains when primary models are unavailable
 * Defines the sequence of alternatives to try
 */
export const FALLBACK_CHAINS = {
  deepseek: {
    alternatives: ['llama', 'mistral'],
    maxAttempts: 3,
    failureThreshold: 2, // Number of consecutive failures before trying alternative
  },
  llama: {
    alternatives: ['deepseek', 'mistral'],
    maxAttempts: 3,
    failureThreshold: 2,
  },
  mistral: {
    alternatives: ['llama', 'deepseek'],
    maxAttempts: 3,
    failureThreshold: 2,
  },
  clip: {
    alternatives: [], // No direct alternative for image analysis
    maxAttempts: 3,
    failureThreshold: 2,
  },
};

/**
 * Request timeout configurations in milliseconds
 */
export const REQUEST_TIMEOUTS = {
  deepseek: 30000, // 30 seconds
  llama: 60000, // 60 seconds (more processing time for self-hosted model)
  mistral: 20000, // 20 seconds
  clip: 30000, // 30 seconds
};

/**
 * Retry configuration for handling transient errors
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 500, // 500ms initial delay
  maxDelay: 5000, // 5 seconds maximum delay
  backoffFactor: 2, // Exponential backoff multiplier
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
};

/**
 * Prompt templates for consistent AI outputs
 */
export const PROMPT_TEMPLATES = {
  contentAnalysis: {
    system: `You are an expert content analyzer for Engagerr, a platform that helps content creators track cross-platform performance.
Analyze the provided content with attention to:
1. Main topics and themes
2. Content quality assessment
3. Engagement potential
4. Key entities mentioned
5. Sentiment and tone
6. Content categorization

Provide your analysis in a structured JSON format with these categories.`,
    examples: [
      {
        content: "How I Built My YouTube Channel to 1M Subscribers",
        response: {
          topics: ["YouTube growth", "content strategy", "audience building"],
          quality: "high",
          engagementPotential: "high",
          entities: ["YouTube", "subscribers", "content creator"],
          sentiment: "positive",
          categories: ["social media", "creator economy", "digital marketing"]
        }
      }
    ]
  },
  
  relationshipDetection: {
    system: `You are Engagerr's content relationship detector. Your purpose is to identify connections between content items.
Analyze the provided content items and determine if and how they are related. Consider:
1. Parent-child relationships (one derived from another)
2. Sibling relationships (derived from same parent)
3. Reference relationships (one mentions or links to another)
4. Thematic relationships (shared topics or themes)

Provide your analysis as a JSON object with relationship type, confidence score, and justification.`,
    examples: [
      {
        content1: "10 Tips for Productivity (YouTube video, 15min)",
        content2: "Productivity Hack #3 from my recent video (TikTok, 30sec)",
        response: {
          relationshipType: "parent-child",
          confidence: 0.92,
          justification: "The TikTok content appears to be a short excerpt directly derived from point #3 in the longer YouTube video.",
          directionality: "content1 is parent of content2"
        }
      }
    ]
  },
  
  creativeGeneration: {
    system: `You are Engagerr's creative content advisor. Your purpose is to suggest content ideas based on creator performance data.
Based on the provided metrics and content history, generate creative content suggestions that are:
1. Aligned with the creator's style and audience
2. Optimized for the specific platforms
3. Likely to perform well based on historical data
4. Innovative but feasible to produce

Provide suggestions in a structured JSON format with platform-specific recommendations.`,
    examples: [
      {
        creatorProfile: "Tech reviewer with strong performance in tutorial content",
        topPerformingContent: ["iPhone teardown", "Android vs iOS comparison"],
        platformFocus: ["YouTube", "TikTok"],
        response: {
          contentIdeas: [
            {
              title: "5-Minute Phone Speedup Tricks",
              platform: "TikTok",
              format: "Tutorial series",
              rationale: "Short tutorials perform well on TikTok and align with audience interest in device optimization"
            },
            {
              title: "What Phone Manufacturers Don't Tell You - Exposed",
              platform: "YouTube",
              format: "Investigative deep-dive",
              rationale: "Leverages audience interest in device internals with compelling hook"
            }
          ]
        }
      }
    ]
  },
  
  classification: {
    system: `You are Engagerr's content classification system. Your purpose is to categorize content into standardized taxonomies.
Analyze the provided content and classify it according to:
1. Primary content category
2. Content format/type
3. Target audience
4. Content tone
5. Industry vertical

Return classifications as a JSON object with confidence scores.`,
    examples: [
      {
        content: "How to Create a Skincare Routine for Sensitive Skin",
        response: {
          primaryCategory: "Beauty & Personal Care",
          confidence: 0.95,
          contentFormat: "How-to/Tutorial",
          targetAudience: ["beauty enthusiasts", "skincare beginners", "people with sensitive skin"],
          contentTone: "informative",
          industryVertical: "Beauty"
        }
      }
    ]
  }
};

/**
 * Retrieves the API key for a specified AI service
 * @param serviceName The name of the AI service (deepseek, huggingface, etc)
 * @returns The API key as a string
 * @throws Error if API key is not configured
 */
export function getApiKey(serviceName: string): string {
  let apiKey: string | undefined;
  
  switch (serviceName.toLowerCase()) {
    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY;
      break;
    case 'huggingface':
    case 'clip':
    case 'blip':
      apiKey = process.env.HUGGINGFACE_API_KEY;
      break;
    default:
      throw new Error(`Unknown AI service: ${serviceName}`);
  }
  
  if (!apiKey) {
    throw new Error(`API key for ${serviceName} is not configured. Please check environment variables.`);
  }
  
  return apiKey;
}

/**
 * Retrieves the endpoint URL for a specified model
 * @param modelName The name of the model (deepseek, llama, mistral, clip)
 * @returns The endpoint URL as a string
 * @throws Error if model endpoint is not configured
 */
export function getModelEndpoint(modelName: string): string {
  const modelKey = modelName.toLowerCase() as keyof typeof MODEL_ENDPOINTS;
  
  if (!MODEL_ENDPOINTS[modelKey]) {
    throw new Error(`Unknown model: ${modelName}`);
  }
  
  return MODEL_ENDPOINTS[modelKey];
}

/**
 * Consolidated AI configuration object for import in other modules
 */
export const aiConfig = {
  MODEL_CONFIG,
  MODEL_ENDPOINTS,
  MODEL_SELECTION_RULES,
  FALLBACK_CHAINS,
  REQUEST_TIMEOUTS,
  RETRY_CONFIG,
  PROMPT_TEMPLATES,
};

export default aiConfig;