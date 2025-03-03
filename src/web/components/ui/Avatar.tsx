import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';
import { getInitials } from '../../lib/utils';

/**
 * Generates classes for avatar variants based on size and shape options
 */
const avatarVariants = cva(
  "inline-flex items-center justify-center overflow-hidden",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-sm",
        md: "h-10 w-10 text-base",
        lg: "h-12 w-12 text-lg",
        xl: "h-16 w-16 text-xl",
      },
      shape: {
        circle: "rounded-full",
        rounded: "rounded-md",
        square: "rounded-none",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  }
);

export type AvatarVariantsType = VariantProps<typeof avatarVariants>;

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null | undefined;
  alt: string;
  name?: string | null | undefined;
  fallbackDelayMs?: number;
}

/**
 * Avatar component that displays a user's image or their initials as a fallback
 */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size, shape, className, fallbackDelayMs = 600, ...props }, ref) => {
    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, shape }), className)}
        {...props}
      >
        {src && <AvatarImage src={src} alt={alt} />}
        <AvatarFallback delayMs={fallbackDelayMs}>
          {name ? getInitials(name) : alt.charAt(0).toUpperCase()}
        </AvatarFallback>
      </AvatarPrimitive.Root>
    );
  }
);

Avatar.displayName = "Avatar";

/**
 * Sub-component for rendering the image within the Avatar
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("h-full w-full object-cover", className)}
    {...props}
  />
));

AvatarImage.displayName = "AvatarImage";

/**
 * Sub-component for rendering the fallback content when the image fails to load
 */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-muted text-muted-foreground",
      className
    )}
    {...props}
  />
));

AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
export default Avatar;