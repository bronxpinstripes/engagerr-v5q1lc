import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';

import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import { Button } from '../../../components/ui/Button';
import { api } from '../../../lib/api';

/**
 * Email verification page component that processes verification tokens from URL query parameters,
 * validates them with the API, and displays appropriate success or error feedback to users.
 * @returns React component for email verification
 */
export default function VerifyPage() {
  // Initialize hooks for navigation, params, authentication, and notifications
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  
  // Get token from search parameters
  const token = searchParams.get('token');
  
  // State to track verification status and error message
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  /**
   * Function to verify the email verification token with the API
   * @param token The token to verify
   * @returns Promise resolving to success status
   */
  async function verifyToken(token: string): Promise<boolean> {
    try {
      await api.post('/api/auth/verify', { token });
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  // Process verification token on component mount
  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setErrorMessage('Verification token is missing');
      toast.error('Verification Failed', 'No verification token was provided');
      return;
    }
    
    async function verify() {
      try {
        await verifyToken(token);
        setVerificationStatus('success');
        toast.success('Email Verified', 'Your email has been successfully verified');
      } catch (error: any) {
        setVerificationStatus('error');
        setErrorMessage(error.message || 'Failed to verify email');
        toast.error('Verification Failed', error.message || 'An error occurred during verification');
      }
    }
    
    verify();
  }, [token, toast]);
  
  // Loading state UI
  if (verificationStatus === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-4 border-t-blue-600 animate-spin"></div>
            <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
              Verifying your email
            </h2>
            <p className="mt-2 text-center text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Success state UI
  if (verificationStatus === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          <div className="flex flex-col items-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-center text-gray-600">
              Your email has been successfully verified. You can now access all features of your account.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => router.push(isAuthenticated ? '/dashboard' : '/auth/login')}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state UI
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        <div className="flex flex-col items-center">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Verification Failed
          </h2>
          <p className="mt-2 text-center text-gray-600">
            {errorMessage || 'We could not verify your email address. The verification link may be invalid or expired.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 w-full">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              Return to Login
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/auth/resend-verification')}
            >
              Resend Verification Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}