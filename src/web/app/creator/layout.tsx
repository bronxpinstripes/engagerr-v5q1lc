import React, { Suspense } from 'react'; // react v18.0+
import { redirect } from 'next/navigation'; // next/navigation ^14.0.0

import DashboardLayout from '../../../components/layout/DashboardLayout';
import CreatorNavigation from '../../../components/layout/CreatorNavigation';
import useAuth from '../../../hooks/useAuth';
import useCreator from '../../../hooks/useCreator';
import { AuthProvider } from '../../../context/AuthContext';
import { NavigationProvider } from '../../../context/NavigationContext';
import { UserType } from '../../../types/user';
import { OnboardingState } from '../../../types/creator';

/**
 * Server component that provides layout and authentication checks for creator pages
 * @param {object} { children }: { children: React.ReactNode }
 * @returns {JSX.Element} The rendered layout with children
 */
const CreatorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access authentication state to determine if user is authenticated
  const { isAuthenticated, isLoading, user } = useAuth();

  // Redirect to login page if user is not authenticated
  if (!isAuthenticated && !isLoading) {
    redirect('/auth/login');
  }

  // Check if authenticated user is a creator
  const { isCreator, onboardingState } = useCreator();

  // Redirect to appropriate dashboard if user is not a creator
  if (isAuthenticated && !isLoading && !isCreator) {
    if (user?.userType === UserType.BRAND) {
      redirect('/brand/dashboard');
    } else {
      redirect('/auth/unauthorized'); // Or a generic unauthorized page
    }
  }

  // Check if creator has completed onboarding
  if (isAuthenticated && isCreator && onboardingState !== OnboardingState.COMPLETED) {
    redirect('/creator/onboarding');
  }

  // Render DashboardLayout with creator-specific navigation and children
  return (
    <AuthProvider>
      <NavigationProvider>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </NavigationProvider>
    </AuthProvider>
  );
};

export default CreatorLayout;