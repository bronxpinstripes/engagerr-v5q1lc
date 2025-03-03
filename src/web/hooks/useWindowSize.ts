import { useState, useEffect, useCallback } from 'react'; // react 18.0+

/**
 * Interface for window dimensions
 */
interface WindowSize {
  width: number | undefined;
  height: number | undefined;
}

/**
 * A custom React hook that tracks and returns the current window dimensions,
 * updating when the window is resized. Provides SSR compatibility and optimized 
 * performance through efficient event handling.
 * 
 * @remarks
 * - Returns undefined for width and height during server-side rendering
 * - Uses memoization to prevent unnecessary re-renders
 * - Automatically cleans up event listeners on unmount
 * 
 * @example
 * const { width, height } = useWindowSize();
 * 
 * // Use dimensions for responsive layouts
 * return (
 *   <div className={width && width < 768 ? 'mobile' : 'desktop'}>
 *     Window size: {width}px x {height}px
 *   </div>
 * );
 * 
 * @returns Object containing the current window width and height
 */
export function useWindowSize(): WindowSize {
  // Initialize with undefined values for SSR compatibility
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  });

  // Create a memoized resize handler to prevent unnecessary re-renders
  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    // Check if window is defined (for SSR compatibility)
    if (typeof window !== 'undefined') {
      // Add event listener
      window.addEventListener('resize', handleResize);
      
      // Call handler right away to get initial size
      handleResize();
      
      // Remove event listener on cleanup
      return () => window.removeEventListener('resize', handleResize);
    }
    // Return empty cleanup function if window is not defined
    return () => {};
  }, [handleResize]); // Only re-run if handleResize changes

  return windowSize;
}