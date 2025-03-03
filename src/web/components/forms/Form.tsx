import React from 'react';
import { FormProvider, UseFormReturn, SubmitHandler } from 'react-hook-form'; // v7.45.0
import { cn } from '../../lib/utils';

/**
 * Props for the Form component.
 * @template TFormValues - The type of values the form will handle.
 */
export interface FormProps<TFormValues extends Record<string, any> = Record<string, any>>
  extends Omit<React.ComponentPropsWithoutRef<'form'>, 'onSubmit'> {
  /** React Hook Form's form methods */
  form: UseFormReturn<TFormValues>;
  /** Form submission handler */
  onSubmit: SubmitHandler<TFormValues>;
}

/**
 * A reusable form component that integrates with React Hook Form.
 * Provides form context to child components and ensures consistent styling.
 * This component is built on the Shadcn UI approach for forms with
 * Engagerr's styling system.
 * 
 * @example
 * ```tsx
 * const form = useForm<LoginFormValues>();
 * 
 * return (
 *   <Form form={form} onSubmit={handleLogin}>
 *     <FormField
 *       control={form.control}
 *       name="email"
 *       render={({ field }) => (
 *         <FormItem>
 *           <FormLabel>Email</FormLabel>
 *           <FormControl>
 *             <Input placeholder="Enter your email" {...field} />
 *           </FormControl>
 *           <FormMessage />
 *         </FormItem>
 *       )}
 *     />
 *     <Button type="submit">Login</Button>
 *   </Form>
 * );
 * ```
 * 
 * @template TFormValues - The type of values the form will handle.
 */
const Form = <TFormValues extends Record<string, any> = Record<string, any>>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<TFormValues>) => {
  return (
    <FormProvider {...form}>
      <form
        className={cn(
          'space-y-6',
          className
        )}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        aria-live="polite"
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
};

export default Form;