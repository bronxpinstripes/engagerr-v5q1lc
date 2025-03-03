import React, { useState, useEffect } from 'react'; // react v18.0+
import { z } from 'zod'; // zod v3.22+
import { useForm } from 'react-hook-form'; // react-hook-form v7.45+
import { zodResolver } from '@hookform/resolvers/zod'; // @hookform/resolvers/zod v3.1.1
import { useRouter, useSearchParams } from 'next/navigation'; // next/navigation v14.0+
import Link from 'next/link'; // next/link
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../forms/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { passwordSchema } from '../../lib/validators';

/**
 * Type definition for the form values
 */
type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

/**
 * Zod schema for validating the reset password form inputs
 */
const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, {
      message: 'Confirm Password is required',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/**
 * Component that renders a password reset form with validation and error handling
 */
const ResetPasswordForm = () => {
  // Extract token from URL search parameters using useSearchParams
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Set up state variables for isLoading, isSuccess, and tokenValid
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Set up form with useForm hook, using resetPasswordSchema for validation
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  // Get resetPassword and validateResetToken functions from useAuth hook
  const { resetPassword, updatePassword } = useAuth();

  // Get toast function from useToast hook
  const { toast } = useToast();

  // Set up router for navigation after successful reset
  const router = useRouter();

  // Use useEffect to validate token on component mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
  }, [token]);

  // Define onSubmit handler to process the form data
  async function onSubmit(values: ResetPasswordFormValues) {
    setIsLoading(true);

    try {
      // Try to reset password with token and new password
      if (token) {
        const response = await updatePassword({ password: values.password, token });

        if (response && !response.error) {
          // Show success message and redirect to login page after success
          toast({
            title: 'Password reset successful',
            description: 'You can now login with your new password.',
          });
          setIsSuccess(true);
          router.push('/login');
        } else {
          // Show error message if reset fails
          toast({
            title: 'Password reset failed',
            description: response?.error?.message || 'An unexpected error occurred.',
            type: 'error',
          });
        }
      } else {
        toast({
          title: 'Password reset failed',
          description: 'Invalid reset token.',
          type: 'error',
        });
        setTokenValid(false);
      }
    } catch (error: any) {
      // Show error message if reset fails
      toast({
        title: 'Password reset failed',
        description: error?.message || 'An unexpected error occurred.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container relative flex h-[800px] flex-col items-center justify-center md:grid lg:max-w-none lg:px-0">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password to reset your account.
          </p>
        </div>
        {!tokenValid && (
          <Alert variant="error">
            Invalid or expired reset token. Please request a new password reset.
          </Alert>
        )}
        {isSuccess && (
          <Alert variant="success">
            Password reset successful! Redirecting to login...
          </Alert>
        )}
        <Form form={form} onSubmit={onSubmit}>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={isLoading} type="submit" className="w-full">
            {isLoading ? (
              <>
                <span className="sr-only">Submitting...</span>
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </Form>
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>
        <Link href="/login" className="mt-4 text-center text-sm underline underline-offset-4">
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordForm;