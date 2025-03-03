import { useState, useEffect } from 'react'; // react ^18.0.0

/**
 * A hook that returns a debounced version of the provided value
 * that only updates after a specified delay has passed without the value changing.
 * Useful for optimizing performance with frequently changing values like search inputs,
 * window resizing, or other user-triggered events.
 * 
 * @param value - The value to debounce (can be any type)
 * @param delay - The delay time in milliseconds
 * @returns The debounced value that updates after the specified delay
 * 
 * @example
 * // Basic usage for a search input
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // This effect will only run when debouncedSearchTerm changes
 *   // which happens 500ms after the user stops typing
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
function useDebounce<T>(value: T, delay: number): T {
  // Initialize state with the initial value provided
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    // Create a timeout that will update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Include a cleanup function to clear the timeout when the component unmounts
    // or when dependencies change (which starts a new timer)
    return () => {
      clearTimeout(timer);
    };
    
    // Re-run the effect when the value or delay changes
  }, [value, delay]);
  
  // Return the debounced value which will lag behind the actual value by the specified delay
  return debouncedValue;
}

export default useDebounce;