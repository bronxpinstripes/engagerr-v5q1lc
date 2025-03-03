import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod'; // ^3.1.0
import { useForm } from 'react-hook-form'; // ^7.45.0
import { useRouter } from 'next/navigation'; // ^14.0.0
import Link from 'next/link'; // ^14.0.0

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
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup';
import OAuthButtons from './OAuthButtons';
import useAuth from '../../hooks/useAuth';
import { registerSchema } from '../../lib/validators';
import { UserType } from '../../types/user';
import { RegisterFormData } from '../../types/auth';

/**
 * A form component for user registration that handles validation and submission for both Creator and Brand account types
 * @returns {JSX.Element} The rendered registration form component
 */
const RegisterForm = (): JSX.Element => {
  // Initialize form with react-hook-form and zodResolver for validation
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      userType: UserType.CREATOR,
      termsAccepted: false,
    },
  });

  // Set up loading state for form submission
  const [isLoading, setIsLoading] = useState(false);

  // Access auth register function from useAuth hook
  const { register } = useAuth();

  // Access router for navigation after successful registration
  const router = useRouter();

  /**
   * Define form submission handler that validates and submits registration data
   * @param {RegisterFormData} data - The registration form data
   */
  const onSubmit = async (data: RegisterFormData) => {
    // Set loading state to true during form submission
    setIsLoading(true);

    try {
      // Submit registration data to the auth service
      const response = await register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        userType: data.userType,
      });

      // Handle successful registration
      if (response?.user) {
        // Redirect user to appropriate onboarding page based on account type
        if (response.user.userType === UserType.CREATOR) {
          router.push('/creator/onboarding');
        } else if (response.user.userType === UserType.BRAND) {
          router.push('/brand/onboarding');
        }
      }
    } catch (error: any) {
      // Handle API errors and display them to the user
      form.setError('root', {
        message: error.message || 'Registration failed. Please try again.',
      });
    } finally {
      // Reset loading state after form submission
      setIsLoading(false);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormField
        control={form.control}
        name="fullName"
        label="Full Name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter your full name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        label="Email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="Enter your email" {...field} type="email" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        label="Password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your password"
                type="password"
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
        label="Confirm Password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirm Password</FormLabel>
            <FormControl>
              <Input
                placeholder="Confirm your password"
                type="password"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="userType"
        label="Account Type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={UserType.CREATOR} id="creator" />
                  <FormLabel htmlFor="creator">Creator</FormLabel>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={UserType.BRAND} id="brand" />
                  <FormLabel htmlFor="brand">Brand</FormLabel>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button type="submit" isLoading={isLoading} disabled={isLoading}>
        Create Account
      </Button>

      <OAuthButtons className="mt-4" />

      <div className="text-sm text-center mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log In
        </Link>
      </div>
    </Form>
  );
};

export default RegisterForm;