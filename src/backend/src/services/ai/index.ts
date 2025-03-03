/**
 * AI Service Index
 *
 * Central index file that consolidates and exports all AI services and utilities
 * for Engagerr's multi-model AI architecture. This file acts as the entry point
 * for the AI service layer, providing access to specialized AI models for different
 * tasks including content analysis, relationship detection, classification, and image processing.
 */

import AIRouter, { classifyTask, selectModelForTask } from './router'; // Import the AI Router for task routing and model management
import DeepSeekService from './deepseek'; // Import the DeepSeek service for general language tasks
import LlamaService from './llama'; // Import the Llama service for content analysis
import MistralService from './mistral'; // Import the Mistral service for classification tasks
import { analyzeImage, extractImageFeatures, generateImageCaption, detectImageObjects, calculateImageSimilarity } from './clip'; // Import image analysis function from CLIP service
import { analyzeContent, generateCreativeContent, generateText } from './deepseek'; // Import content analysis function from DeepSeek service

// Export the AI Router as the default export
export default AIRouter;

// Export individual services and functions for granular access
export {
  DeepSeekService, // Export the DeepSeek service class
  LlamaService, // Export the Llama service class
  MistralService, // Export the Mistral service class
  analyzeContent, // Export content analysis utility function
  generateCreativeContent, // Export creative content generation utility function
  generateText, // Export text generation utility function
  analyzeImage, // Export image analysis utility function
  extractImageFeatures, // Export image feature extraction utility function
  generateImageCaption, // Export image captioning utility function
  detectImageObjects, // Export object detection utility function
  calculateImageSimilarity, // Export image similarity calculation utility function
  classifyTask, // Export utility function for AI task classification
  selectModelForTask // Export utility function for model selection based on task type
};