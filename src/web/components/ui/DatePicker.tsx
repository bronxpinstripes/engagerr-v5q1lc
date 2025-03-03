import * as React from 'react';
import { format, isValid, parse } from 'date-fns'; // v2.30.0
import { CalendarIcon } from 'lucide-react'; // v0.279.0
import { Calendar } from 'react-day-picker'; // v8.8.0
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover'; // v1.0.0

import { cn } from '../../lib/utils';
import { Button } from './Button';
import Input from './Input';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  /** The currently selected date */
  date?: Date;
  /** Callback function when date changes */
  onDateChange: (date: Date | undefined) => void;
  /** Date format string (using date-fns format) */
  format?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input has an error */
  error?: boolean;
  /** Custom class for the input wrapper */
  className?: string;
  /** Custom class for the calendar popover */
  calendarClassName?: string;
}

/**
 * Formats a date object into a string using the specified format
 */
const formatDate = (date: Date | undefined, formatStr: string = 'PPP'): string => {
  if (!date || !isValid(date)) return '';
  return format(date, formatStr);
};

/**
 * DatePicker component that combines an input field with a calendar popover
 * for selecting dates in a user-friendly way. Follows the application's design
 * system and provides keyboard accessibility and WCAG compliance.
 */
const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ 
    date, 
    onDateChange, 
    format: formatStr = 'PPP', 
    disabled, 
    error, 
    className, 
    calendarClassName, 
    placeholder = 'Select date', 
    ...props 
  }, ref) => {
    // Control the open state of the calendar popover
    const [open, setOpen] = React.useState(false);
    // Track the input value separately to allow for manual entry
    const [inputValue, setInputValue] = React.useState<string>(date ? formatDate(date, formatStr) : '');

    // Update input value when date prop changes
    React.useEffect(() => {
      setInputValue(date ? formatDate(date, formatStr) : '');
    }, [date, formatStr]);

    // Handle manual input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      
      // Clear the date if input is empty
      if (value === '') {
        onDateChange(undefined);
        return;
      }
      
      try {
        // Try with the provided format
        const parsedDate = parse(value, formatStr, new Date());
        
        if (isValid(parsedDate)) {
          onDateChange(parsedDate);
        }
      } catch (error) {
        // Invalid date format - don't update the date
      }
    };

    // Handle date selection from the calendar
    const handleDateChange = (selectedDate: Date | undefined) => {
      onDateChange(selectedDate);
      setOpen(false);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              ref={ref}
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              error={error}
              className={cn("pr-10", className)}
              aria-label={props['aria-label'] || "Date input"}
              {...props}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setOpen(true)}
              disabled={disabled}
              aria-label="Open date picker"
              tabIndex={-1} // Skip in tab order since the input is already focusable
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className={cn("w-auto p-0", calendarClassName)} 
          align="start"
          sideOffset={5}
          aria-label="Calendar dropdown"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
            disabled={disabled}
            classNames={{
              day_selected: "bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-600",
              day_today: "bg-gray-100",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_disabled: "text-gray-400 opacity-50",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              caption: "flex justify-center py-2 relative items-center",
              root: "bg-white text-gray-800"
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

// Add display name for better debugging
DatePicker.displayName = 'DatePicker';

export { DatePicker };
export type { DatePickerProps };