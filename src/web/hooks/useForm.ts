import { useState, useCallback } from 'react';
import { useForm as useReactHookForm, UseFormReturn, FieldValues, SubmitHandler, UseFormProps } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ObjectSchema } from 'yup';

import { FormConfig, FormState, FormError } from '../types/form';
import useToast from './useToast';
import api from '../lib/api';

/**
 * Custom hook that extends react-hook-form with application-specific functionality,
 * including validation, submission handling, and UI feedback.
 * 
 * @param config Configuration options for the form
 * @returns Enhanced form context with methods, state, and submission utilities
 */
function useForm<T extends FieldValues>(config: FormConfig): UseFormReturn<T> & {
  isSubmitting: boolean;
  submitWithAPI: (endpoint: string, method?: 'post' | 'put') => (data: T) => Promise<any>;
  formError: string | null;
} {
  // Initialize the react-hook-form instance with yup resolver
  const formMethods = useReactHookForm<T>({
    defaultValues: config.defaultValues as any,
    resolver: yupResolver(config.validationSchema),
    mode: config.mode || 'onSubmit',
  });

  // State for tracking form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast, success, error } = useToast();

  /**
   * Wraps form submission with loading state and error handling
   */
  const submitHandler = useCallback(
    (onSubmit: SubmitHandler<T>) => {
      return async (data: T) => {
        setIsSubmitting(true);
        setFormError(null);
        
        try {
          await onSubmit(data);
          return true;
        } catch (err: any) {
          const errorMessage = err.message || 'Form submission failed';
          setFormError(errorMessage);
          return false;
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    []
  );

  /**
   * Helper function to streamline API form submissions
   * Handles loading state, error handling, and success/error notifications
   */
  const submitWithAPI = useCallback(
    (endpoint: string, method: 'post' | 'put' = 'post') => {
      return async (data: T) => {
        setIsSubmitting(true);
        setFormError(null);
        
        try {
          const apiMethod = method === 'post' ? api.post : api.put;
          const response = await apiMethod<any>(endpoint, data);
          success('Success', 'Form submitted successfully');
          return response;
        } catch (err: any) {
          const errorMessage = err.message || 'Failed to submit form';
          setFormError(errorMessage);
          error('Error', errorMessage);
          throw err;
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [success, error]
  );

  return {
    ...formMethods,
    isSubmitting,
    submitWithAPI,
    formError,
  };
}

/**
 * Helper function to initialize a form state object with default values
 * 
 * @param defaultValues Initial values for the form fields
 * @param options Additional options for form initialization
 * @returns Initialized form state
 */
function createFormState(
  defaultValues: Record<string, any>,
  options: object = {}
): FormState {
  // Initialize form with default values and standard metadata
  // The options parameter allows for custom initialization behavior
  // that can be extended in the future
  return {
    isSubmitting: false,
    isValid: true, // Initially assume the form is valid
    errors: {} // No errors initially
  };
}

/**
 * Extracts and formats validation errors from react-hook-form error objects
 * 
 * @param errors Form error object from react-hook-form
 * @returns Flattened error messages by field name
 */
function extractFormErrors(errors: FormError): Record<string, string> {
  const result: Record<string, string> = {};

  function extractErrors(obj: any, prefix = '') {
    for (const key in obj) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && obj[key].message === undefined) {
        // Recursively extract errors from nested objects
        extractErrors(obj[key], fullPath);
      } else if (obj[key] && obj[key].message) {
        // Add error message to result with the correct path
        result[fullPath] = obj[key].message;
      }
    }
  }

  extractErrors(errors);
  return result;
}

/**
 * Utility to check if a form is valid based on its errors and validation state
 * 
 * @param formState Form state object
 * @returns Whether the form is valid
 */
function isFormValid(formState: FormState): boolean {
  return formState.isValid && Object.keys(formState.errors).length === 0;
}

export default useForm;
export { createFormState, extractFormErrors, isFormValid };