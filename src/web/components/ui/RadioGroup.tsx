"use client"

import * as React from "react"
import { forwardRef } from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group" // v1.1.3
import { Circle } from "lucide-react" // v0.279.0

import { cn } from "../../lib/utils"

/**
 * Props for the RadioGroup component
 * Extends Radix UI RadioGroup.Root props with optional orientation
 */
type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
  orientation?: "horizontal" | "vertical"
}

/**
 * Props for the RadioGroupItem component
 * Extends Radix UI RadioGroup.Item props
 */
type RadioGroupItemProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>

/**
 * An individual radio button component for use within RadioGroup
 */
const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

/**
 * A container component for radio button options with proper keyboard navigation
 * and screen reader support
 */
const RadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, orientation = "vertical", ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      className={cn(
        "gap-2",
        orientation === "horizontal" ? "flex items-center" : "flex flex-col",
        className
      )}
      {...props}
    />
  )
})
RadioGroup.displayName = "RadioGroup"

export { RadioGroup, RadioGroupItem }
export default RadioGroup