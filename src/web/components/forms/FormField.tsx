import React, { useId } from "react";
import {
  Controller,
  useFormContext,
  FieldValues,
  FieldPath,
  ControllerProps,
  ControllerRenderProps,
  ControllerFieldState,
  UseFormStateReturn
} from "react-hook-form"; // ^7.45.0

import FormItem from "./FormItem";
import FormLabel from "./FormLabel";
import FormControl from "./FormControl";
import { FormMessage } from "./FormMessage";
import { FormDescription } from "./FormDescription";

/**
 * Props for the FormField component
 */
interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label: string;
  description?: string;
  required?: boolean;
  children: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<TFieldValues>;
  }) => React.ReactElement;
}

/**
 * A component that integrates with react-hook-form to create a standardized form field
 * with label, control, optional description, and error message.
 * 
 * Combines FormItem, FormLabel, FormControl, and FormMessage components in a
 * standardized layout with proper accessibility attributes.
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  rules,
  required,
  children,
  ...props
}: FormFieldProps<TFieldValues, TName>) {
  const { control: formControl } = useFormContext<TFieldValues>();
  const id = useId();
  
  return (
    <Controller
      name={name}
      control={control || formControl}
      rules={rules}
      {...props}
      render={({ field, fieldState, formState }) => (
        <FormItem>
          <FormLabel htmlFor={id} optional={!required}>
            {label}
          </FormLabel>
          <FormControl>
            {React.cloneElement(children({ field, fieldState, formState }), {
              id,
              "aria-invalid": !!fieldState.error,
              "aria-describedby": fieldState.error 
                ? `${id}-error` 
                : description 
                  ? `${id}-description` 
                  : undefined,
            })}
          </FormControl>
          
          {description && (
            <FormDescription id={`${id}-description`}>
              {description}
            </FormDescription>
          )}
          
          <FormMessage id={`${id}-error`}>
            {fieldState.error?.message}
          </FormMessage>
        </FormItem>
      )}
    />
  );
}