import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { isClient } from '../lib/utils';

/**
 * Custom hook that provides a state value that is synchronized with localStorage.
 * Features:
 * - Type safety for stored values
 * - SSR compatibility
 * - Cross-tab synchronization
 * - Error handling for localStorage operations
 * 
 * @template T - Type of the state value
 * @param {string} key - The localStorage key to use
 * @param {T} initialValue - The initial value if no value is found in localStorage
 * @returns {[T, Dispatch<SetStateAction<T>>]} - A tuple with the current value and a function to update it
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Create a state hook to store the current value
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Return the initial value if running on the server
    if (!isClient()) {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (isClient()) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    if (!isClient()) {
      return;
    }

    // This is where we listen for localStorage changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          // If the key matches and we have a new value, update our state
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage item "${key}":`, error);
        }
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;