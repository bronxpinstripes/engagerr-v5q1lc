import { AI_CONFIG } from '../../../config/ai';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../utils/errors';
import { metrics } from '../../../monitoring/metrics';
import fetch from 'node-fetch'; // ^2.6.7
import FormData from 'form-data'; // ^4.0.0

// Default options for image analysis
const DEFAULT_OPTIONS = {
  maxCaptionLength: 100,
  confidenceThreshold: 0.5,
  timeout: 30000 // 30 seconds
};

// Types for image analysis options
interface ImageAnalysisOptions {
  maxCaptionLength?: number;
  confidenceThreshold?: number;
  timeout?: number;
}

// Types for image analysis results
interface ImageAnalysisResult {
  features?: number[];
  caption?: string;
  objects?: ImageObject[];
  raw?: any;
}

// Type for detected objects in an image
interface ImageObject {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Analyzes an image using CLIP/BLIP model to extract visual features and descriptive information
 * 
 * @param imageData Buffer or URL string of the image to analyze
 * @param analysisType Type of analysis to perform ('clip', 'blip', 'object-detection')
 * @param options Additional options for the analysis
 * @returns Analysis result containing visual features and/or descriptive text
 */
export async function analyzeImage(
  imageData: Buffer | string,
  analysisType: string = 'clip',
  options: ImageAnalysisOptions = {}
): Promise<ImageAnalysisResult> {
  // Merge default options with provided options
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Start metrics tracking
  const startTime = Date.now();
  
  try {
    // Determine which endpoint to use based on analysis type
    let endpoint;
    if (analysisType === 'clip') {
      endpoint = AI_CONFIG.HUGGING_FACE_ENDPOINTS.CLIP;
    } else if (analysisType === 'blip') {
      endpoint = AI_CONFIG.HUGGING_FACE_ENDPOINTS.BLIP;
    } else if (analysisType === 'object-detection') {
      endpoint = AI_CONFIG.HUGGING_FACE_ENDPOINTS.OBJECT_DETECTION;
    } else {
      throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
    
    if (!endpoint) {
      throw new Error(`Endpoint not configured for analysis type: ${analysisType}`);
    }
    
    // Prepare the image data for submission
    const formData = await prepareImageData(imageData);
    
    // Create request options with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout);
    
    // Log the request
    logger.info({
      action: 'analyzeImage',
      analysisType,
      endpoint: endpoint.split('/').pop(),
      isBufferData: Buffer.isBuffer(imageData)
    }, 'Sending image for analysis');
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.HUGGING_FACE_API_KEY}`
      },
      body: formData,
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check for successful response
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        `Hugging Face API error (${response.status}): ${errorText}`,
        response.status
      );
    }
    
    // Parse the response
    const result = await response.json();
    
    // Process the result based on analysis type
    let processedResult: ImageAnalysisResult = { raw: result };
    
    if (analysisType === 'clip') {
      // CLIP returns feature vectors
      processedResult.features = Array.isArray(result) ? result : result.features;
    } else if (analysisType === 'blip') {
      // BLIP returns generated captions
      processedResult.caption = typeof result === 'string' ? 
        result : (result.caption || result.generated_text || '');
      
      // Limit caption length if needed
      if (processedResult.caption && opts.maxCaptionLength) {
        processedResult.caption = processedResult.caption.substring(0, opts.maxCaptionLength);
      }
    } else if (analysisType === 'object-detection') {
      // Process object detection results
      if (Array.isArray(result)) {
        processedResult.objects = result
          .filter(obj => obj.score >= opts.confidenceThreshold)
          .map(obj => ({
            label: obj.label,
            confidence: obj.score,
            boundingBox: obj.box ? {
              x: obj.box.xmin,
              y: obj.box.ymin,
              width: obj.box.xmax - obj.box.xmin,
              height: obj.box.ymax - obj.box.ymin
            } : undefined
          }));
      }
    }
    
    // Record metrics
    const duration = Date.now() - startTime;
    metrics.recordAILatency('CLIP_BLIP', duration);
    metrics.incrementAIRequestCount('CLIP_BLIP', analysisType);
    
    // Log success
    logger.info({
      action: 'analyzeImage',
      analysisType,
      duration,
      hasFeatures: !!processedResult.features,
      hasCaption: !!processedResult.caption,
      objectCount: processedResult.objects?.length
    }, 'Image analysis completed successfully');
    
    return processedResult;
  } catch (error) {
    // Record the error in metrics
    metrics.incrementAIRequestCount('CLIP_BLIP', `${analysisType}_error`);
    
    // Log the error
    logger.error({
      action: 'analyzeImage',
      analysisType,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime
    }, 'Image analysis failed');
    
    // Re-throw as ApiError if it's not already one
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `Image analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      500
    );
  }
}

/**
 * Extracts feature vectors from an image using CLIP model for similarity comparison
 * 
 * @param imageData Buffer or URL string of the image to analyze
 * @returns Vector representation of the image for similarity matching
 */
export async function extractImageFeatures(
  imageData: Buffer | string
): Promise<number[]> {
  try {
    // Use the analyzeImage function with CLIP model
    const result = await analyzeImage(imageData, 'clip');
    
    // Ensure features were returned
    if (!result.features || !Array.isArray(result.features) || result.features.length === 0) {
      throw new Error('No feature vector returned from CLIP model');
    }
    
    // Return the feature vector
    return result.features;
  } catch (error) {
    logger.error({
      action: 'extractImageFeatures',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to extract image features');
    
    throw error;
  }
}

/**
 * Generates a descriptive caption for an image using BLIP model
 * 
 * @param imageData Buffer or URL string of the image to caption
 * @param options Additional options for caption generation
 * @returns Generated descriptive caption for the image
 */
export async function generateImageCaption(
  imageData: Buffer | string,
  options: ImageAnalysisOptions = {}
): Promise<string> {
  try {
    // Use the analyzeImage function with BLIP model
    const result = await analyzeImage(imageData, 'blip', options);
    
    // Return the caption or empty string if none was generated
    return result.caption || '';
  } catch (error) {
    logger.error({
      action: 'generateImageCaption',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to generate image caption');
    
    throw error;
  }
}

/**
 * Detects objects and entities present in an image
 * 
 * @param imageData Buffer or URL string of the image to analyze
 * @returns Array of detected objects with labels and confidence scores
 */
export async function detectImageObjects(
  imageData: Buffer | string
): Promise<ImageObject[]> {
  try {
    // Use the analyzeImage function with object detection model
    const result = await analyzeImage(imageData, 'object-detection');
    
    // Return the detected objects or empty array if none were found
    return result.objects || [];
  } catch (error) {
    logger.error({
      action: 'detectImageObjects',
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to detect image objects');
    
    throw error;
  }
}

/**
 * Calculates similarity between two images using their feature vectors
 * Uses cosine similarity which ranges from -1 (opposite) to 1 (identical)
 * 
 * @param featuresA First image feature vector
 * @param featuresB Second image feature vector
 * @returns Similarity score between 0 and 1
 */
export function calculateImageSimilarity(featuresA: number[], featuresB: number[]): number {
  // Verify that both vectors have the same dimensions
  if (featuresA.length !== featuresB.length) {
    throw new Error(`Feature vectors have different dimensions: ${featuresA.length} vs ${featuresB.length}`);
  }
  
  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < featuresA.length; i++) {
    dotProduct += featuresA[i] * featuresB[i];
  }
  
  // Calculate magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < featuresA.length; i++) {
    magnitudeA += featuresA[i] * featuresA[i];
    magnitudeB += featuresB[i] * featuresB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  // Calculate cosine similarity
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  
  // Normalize to 0-1 range (cosine similarity ranges from -1 to 1)
  // For visual features, we're usually interested in positive similarity
  return Math.max(0, similarity);
}

/**
 * Prepares image data for submission to the Hugging Face API
 * Handles both Buffer objects and URL strings
 * 
 * @param imageData Buffer or URL string of the image
 * @returns FormData object ready for API submission
 */
async function prepareImageData(imageData: Buffer | string): Promise<FormData> {
  const formData = new FormData();
  
  if (Buffer.isBuffer(imageData)) {
    // If we already have a buffer, use it directly
    formData.append('file', imageData, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });
  } else if (typeof imageData === 'string') {
    // If we have a URL, we need to fetch the image first
    if (imageData.startsWith('http')) {
      try {
        const response = await fetch(imageData);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        
        formData.append('file', buffer, {
          filename: 'image.jpg',
          contentType: response.headers.get('content-type') || 'image/jpeg'
        });
      } catch (error) {
        throw new Error(`Failed to fetch image from URL: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Assume it's a Base64 encoded string
      try {
        // Remove data URL prefix if present
        let base64Data = imageData;
        if (base64Data.startsWith('data:')) {
          const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const contentType = matches[1];
            base64Data = matches[2];
            
            const buffer = Buffer.from(base64Data, 'base64');
            
            formData.append('file', buffer, {
              filename: 'image.jpg',
              contentType
            });
          } else {
            throw new Error('Invalid data URL format');
          }
        } else {
          // Plain Base64 string
          const buffer = Buffer.from(base64Data, 'base64');
          
          formData.append('file', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
          });
        }
      } catch (error) {
        throw new Error(`Failed to process Base64 image data: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    throw new Error('Invalid image data: must be a Buffer or string URL/Base64');
  }
  
  return formData;
}