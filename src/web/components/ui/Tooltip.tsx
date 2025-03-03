import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip"; // ^1.0.6

import { cn } from "../../lib/utils";

/**
 * Provider component that shares tooltip state and options across multiple tooltip instances
 */
const TooltipProvider = ({ 
  ...props 
}: TooltipPrimitive.TooltipProviderProps) => (
  <TooltipPrimitive.Provider 
    delayDuration={200} 
    skipDelayDuration={0} 
    {...props} 
  />
);

/**
 * Root tooltip component that manages tooltip state and context
 */
const Tooltip = ({ 
  ...props 
}: TooltipPrimitive.TooltipProps) => (
  <TooltipPrimitive.Root 
    delayDuration={200} 
    {...props} 
  />
);

/**
 * Element that triggers the tooltip to appear on hover or focus
 */
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ ...props }, ref) => (
  <TooltipPrimitive.Trigger ref={ref} {...props} />
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

/**
 * Component that renders the actual tooltip content with consistent styling
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary text-white px-3 py-1.5 text-xs shadow-md transition-opacity duration-200",
      "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };