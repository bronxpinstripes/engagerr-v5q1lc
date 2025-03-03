import React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the skeleton. Can be a string (e.g., '100%') or a number (treated as pixels).
   */
  width?: string | number;
  
  /**
   * Height of the skeleton. Can be a string (e.g., '100%') or a number (treated as pixels).
   */
  height?: string | number;
  
  /**
   * Variant of the skeleton. 'circle' creates a rounded skeleton, 'default' creates a 
   * rectangular skeleton with rounded corners.
   */
  variant?: "circle" | "default";
}

/**
 * A customizable skeleton loader component for showing loading states.
 * 
 * Used throughout the Engagerr platform to improve perceived performance and user experience
 * during content loading, data fetching, and processing operations.
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, variant = "default", ...props }, ref) => {
    // Determine the shape class based on variant
    const shapeClass = variant === "circle" ? "rounded-full" : "rounded";
    
    // Calculate style props for width and height
    const style: React.CSSProperties = {};
    
    if (width !== undefined) {
      style.width = typeof width === "number" ? `${width}px` : width;
    }
    
    if (height !== undefined) {
      style.height = typeof height === "number" ? `${height}px` : height;
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "bg-gray-200 animate-pulse", 
          shapeClass,
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

export default Skeleton;