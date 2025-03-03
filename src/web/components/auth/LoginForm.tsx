import React, { useState } from 'react'; // React v18.0+
import { Link } from 'next/link'; // Next.js
import { useForm } from '../../hooks/useForm'; // Custom form hook
import { useAuth } from '../../hooks/useAuth'; // Authentication hook
import { loginSchema } from '../../lib/validators'; // Validation schema
import { LoginCredentials } from '../../types/auth'; // Type definition
import Form from '../forms/Form'; // Form wrapper component
import FormField from '../forms/FormField'; // Form field component
import Input from '../ui/Input'; // Input component
import Button from '../ui/Button'; // Button component
import OAuthButtons from './OAuthButtons'; // Social authentication buttons

/**
 * The main login form component that handles user authentication
 * @param props 
 * @returns The rendered login form
 */
const LoginForm: React.FC = (props) => {
  // LD1: Initialize form state with useForm hook and loginSchema validation
  const form = useForm<LoginCredentials>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validationSchema: loginSchema,
  });

  // LD1: Get login function from useAuth hook
  const { login } = useAuth();

  // LD1: Track loading state with useState to handle form submission progress
  const [loading, setLoading] = useState(false);

  // LD1: Define form submission handler that calls login function with form data
  const handleSubmit = async (data: LoginCredentials) => {
    setLoading(true);
    try {
      // IE1: Call login function with form data
      await login(data);
    } catch (error) {
      // Handle login errors
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // LD1: Render Form component with form methods and submission handler
  return (
    <Form form={form} onSubmit={handleSubmit} {...props}>
      {/* LD1: Render email input field with validation */}
      <FormField
        control={form.control}
        name="email"
        label="Email"
        required
        render={({ field }) => (
          <Input
            placeholder="Enter your email"
            type="email"
            {...field}
            error={!!form.formState.errors.email}
          />
        )}
      />

      {/* LD1: Render password input field with validation */}
      <FormField
        control={form.control}
        name="password"
        label="Password"
        required
        render={({ field }) => (
          <Input
            placeholder="Enter your password"
            type="password"
            {...field}
            error={!!form.formState.errors.password}
          />
        )}
      />

      {/* LD1: Render remember me checkbox (optional) */}
      {/* <FormField
        control={form.control}
        name="rememberMe"
        render={({ field }) => (
          <div className="flex items-center space-x-2">
            <Input
              id="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              {...field}
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none text-gray-700"
            >
              Remember me
            </label>
          </div>
        )}
      /> */}

      {/* LD1: Render password reset link */}
      <div className="text-sm">
        <Link href="/auth/reset-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>

      {/* LD1: Render login button with loading state */}
      <Button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </Button>

      {/* LD1: Render OAuthButtons component for social login options */}
      <OAuthButtons />

      {/* LD1: Render link to registration page for new users */}
      <div className="text-sm">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </div>
    </Form>
  );
};

// IE3: Export LoginForm component for use in other parts of the application
export default LoginForm;