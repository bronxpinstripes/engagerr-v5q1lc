import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

import { Button } from '../ui/Button';
import { useAuthContext } from '../../context/AuthContext';
import { OAuthProvider } from '../../types/auth';
import { AUTH_PROVIDERS } from '../../lib/constants';
import { oauthLogin } from '../../lib/auth';

/**
 * Props for the OAuthButtons component
 */
interface OAuthButtonsProps {
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
  
  /**
   * Visual style of the buttons
   */
  variant?: string;
  
  /**
   * Size of the buttons
   */
  size?: string;
}

/**
 * Component that renders OAuth authentication buttons for Google and Apple
 * Used in login and registration flows to provide alternative authentication methods
 */
const OAuthButtons = ({
  className,
  variant = 'outline',
  size = 'default',
}: OAuthButtonsProps) => {
  // Get auth context - we need to include this to match the app's authentication system
  const { state } = useAuthContext();

  /**
   * Handles authentication with Google
   */
  const handleGoogleAuth = () => {
    oauthLogin(OAuthProvider.GOOGLE);
  };

  /**
   * Handles authentication with Apple
   */
  const handleAppleAuth = () => {
    oauthLogin(OAuthProvider.APPLE);
  };

  return (
    <div className={className}>
      {/* Divider between email/password and OAuth options */}
      <div className="relative flex items-center justify-center my-6">
        <div className="absolute border-t border-gray-300 w-full"></div>
        <div className="relative bg-white px-4 text-sm text-gray-500">OR</div>
      </div>

      <div className="space-y-3">
        {/* Google OAuth button */}
        <Button
          variant={variant}
          size={size}
          className="w-full flex items-center justify-center"
          onClick={handleGoogleAuth}
          aria-label="Sign in with Google"
          disabled={state.isLoading}
        >
          <FcGoogle className="h-5 w-5 mr-2" aria-hidden="true" />
          Continue with Google
        </Button>

        {/* Apple OAuth button */}
        <Button
          variant={variant}
          size={size}
          className="w-full flex items-center justify-center"
          onClick={handleAppleAuth}
          aria-label="Sign in with Apple"
          disabled={state.isLoading}
        >
          <FaApple className="h-5 w-5 mr-2" aria-hidden="true" />
          Continue with Apple
        </Button>
      </div>
    </div>
  );
};

export default OAuthButtons;