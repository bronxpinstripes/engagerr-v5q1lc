import axios, { AxiosError, AxiosInstance } from 'axios';
import { queryClient } from 'react-query'; // v5.0.0
import { API_URL, API_TIMEOUT } from '../lib/constants';
import { getAuthToken } from '../lib/auth';
import { toastError } from '../lib/toast';

/**
 * Creates and returns a configured axios instance with default headers and interceptors
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include authentication token in headers
  client.interceptors.request.use(
    async (config) => {
      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );

  return client;
}

/**
 * Processes API errors and formats them for consistent error handling
 * @param error - The error object from the API request
 * @param showToast - Whether to display an error toast notification
 * @returns Formatted error object with message, code, and details
 */
export function handleApiError(error: any, showToast = true): any {
  let apiError;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status || 500;
    const message = 
      axiosError.response?.data?.message || 
      axiosError.message || 
      'An unexpected error occurred';
    const details = axiosError.response?.data?.details || null;

    apiError = {
      message,
      code: status,
      details,
    };
  } else {
    apiError = {
      message: error.message || 'An unexpected error occurred',
      code: 500,
      details: null,
    };
  }

  if (showToast) {
    toastError('Request Failed', apiError.message);
  }

  return apiError;
}

/**
 * Makes a GET request to the specified endpoint
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @param options - Additional request options
 * @returns Promise resolving to the response data
 */
async function get<T>(endpoint: string, params?: any, options?: any): Promise<T> {
  try {
    const client = createApiClient();
    const response = await client.get<T>(endpoint, {
      params,
      ...options
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, options?.showErrorToast !== false);
  }
}

/**
 * Makes a POST request to the specified endpoint
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param options - Additional request options
 * @returns Promise resolving to the response data
 */
async function post<T>(endpoint: string, data?: any, options?: any): Promise<T> {
  try {
    const client = createApiClient();
    const response = await client.post<T>(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw handleApiError(error, options?.showErrorToast !== false);
  }
}

/**
 * Makes a PUT request to the specified endpoint
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param options - Additional request options
 * @returns Promise resolving to the response data
 */
async function put<T>(endpoint: string, data?: any, options?: any): Promise<T> {
  try {
    const client = createApiClient();
    const response = await client.put<T>(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw handleApiError(error, options?.showErrorToast !== false);
  }
}

/**
 * Makes a PATCH request to the specified endpoint
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param options - Additional request options
 * @returns Promise resolving to the response data
 */
async function patch<T>(endpoint: string, data?: any, options?: any): Promise<T> {
  try {
    const client = createApiClient();
    const response = await client.patch<T>(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw handleApiError(error, options?.showErrorToast !== false);
  }
}

/**
 * Makes a DELETE request to the specified endpoint
 * @param endpoint - API endpoint path
 * @param params - Query parameters
 * @param options - Additional request options
 * @returns Promise resolving to the response data
 */
async function del<T>(endpoint: string, params?: any, options?: any): Promise<T> {
  try {
    const client = createApiClient();
    const response = await client.delete<T>(endpoint, {
      params,
      ...options
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, options?.showErrorToast !== false);
  }
}

/**
 * Invalidates cached queries to refetch fresh data
 * @param queryKeys - Array of query keys to invalidate
 * @returns Promise that resolves when invalidation is complete
 */
async function invalidateQueries(queryKeys: string[]): Promise<void> {
  await Promise.all(queryKeys.map(key => queryClient.invalidateQueries(key)));
}

// Export the API object with all methods
export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
  invalidateQueries,
};

export { handleApiError };