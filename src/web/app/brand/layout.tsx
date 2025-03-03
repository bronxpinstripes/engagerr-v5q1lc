import React, { Suspense } from 'react'; // react v18.0+
import { redirect } from 'next/navigation'; // next/navigation v14.0.0
import DashboardLayout from '../../../components/layout/DashboardLayout';
import BrandNavigation from '../../../components/layout/BrandNavigation';
import useAuth from '../../../hooks/useAuth';
import useBrand from '../../../hooks/useBrand';
import { UserType } from '../../../types/user'; // User type enum for type checking
import { OnboardingState } from '../../../types/brand'; // Enum for brand onboarding state

/**
 * Server component that provides layout and authentication checks for brand pages
 * @param {object} { children }: { children: React.ReactNode } - React children to render within the layout
 * @returns {JSX.Element} The rendered layout with children
 */
const BrandLayout = ({ children }: { children: React.ReactNode }): JSX.Element => {
  // LD1: Access authentication state to determine if user is authenticated
  const { isAuthenticated, isLoading, user } = useAuth();

  // LD1: Access brand-specific data and functionality
  const { isBrandUser, brand, brandLoading } = useBrand();

  // LD1: Redirect to login page if user is not authenticated
  if (isLoading) {
    return <div>Loading...</div>; // Or a more sophisticated loading indicator
  }

  if (!isAuthenticated) {
    redirect('/auth/login');
  }

  // LD1: Check if authenticated user is a brand
  if (!isBrandUser) {
    // LD1: Redirect to appropriate dashboard if user is not a brand
    if (user?.userType === UserType.CREATOR) {
      redirect('/creator/dashboard');
    } else {
      redirect('/'); // Or a generic unauthorized page
    }
  }

  // LD1: Check if brand has completed onboarding
  if (brandLoading) {
    return <div>Loading brand data...</div>; // Or a more sophisticated loading indicator
  }

  // LD1: Redirect to onboarding flow if onboarding is not complete
  // if (brand?.onboardingState !== OnboardingState.COMPLETED) {
  //   redirect('/brand/onboarding'); // Replace with actual onboarding route
  // }

  // LD1: Render DashboardLayout with brand-specific navigation and children
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

// LD2: Default export of the BrandLayout component
export default BrandLayout;