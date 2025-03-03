import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const progressBarVariants = cva(
  'relative w-full overflow-hidden rounded-full bg-gray-100',
  {
    variants: {
      variant: {
        default: '[&>div]:bg-gray-200',
        primary: '[&>div]:bg-primary',
        success: '[&>div]:bg-green-500',
        warning: '[&>div]:bg-yellow-500',
        danger: '[&>div]:bg-red-500',
      },
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value: number
  max?: number
  showLabel?: boolean
  labelPosition?: 'inside' | 'outside'
  labelFormat?: (value: number, max: number) => string
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value = 0,
      max = 100,
      variant = 'default',
      size = 'md',
      showLabel = false,
      labelPosition = 'outside',
      labelFormat = (value, max) => `${Math.round((value / max) * 100)}%`,
      className,
      ...props
    },
    ref
  ) => {
    // Calculate progress percentage and ensure it's clamped between 0-100
    const percentage = Math.min(Math.max(0, (value / max) * 100), 100)

    return (
      <div
        ref={ref}
        className={cn(progressBarVariants({ variant, size }), className)}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        {/* Progress bar fill */}
        <div
          className="h-full transition-all"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Progress label */}
        {showLabel && (
          <div
            className={cn(
              'absolute text-xs font-medium',
              labelPosition === 'inside'
                ? `inset-0 flex items-center justify-center ${
                    percentage > 50 && ['primary', 'success', 'danger'].includes(variant || '')
                      ? 'text-white'
                      : 'text-gray-700'
                  }`
                : 'top-0 right-0 -translate-y-full px-1 pb-1 text-xs text-gray-700'
            )}
            aria-hidden="true"
          >
            {labelFormat(value, max)}
          </div>
        )}
      </div>
    )
  }
)

ProgressBar.displayName = 'ProgressBar'

export default ProgressBar