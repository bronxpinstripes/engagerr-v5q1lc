import React from 'react'
import { cn } from '../../lib/utils'

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

/**
 * A component for rendering descriptive or help text for form fields
 * with consistent styling and accessibility support.
 */
function FormDescription({ className, children, ...props }: FormDescriptionProps) {
  return (
    <p 
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export { FormDescription }