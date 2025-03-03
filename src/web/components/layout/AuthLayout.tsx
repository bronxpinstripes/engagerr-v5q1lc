import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthContext } from '../../context/AuthContext';
import Footer from './Footer';
import ThemeToggle from '../ui/ThemeToggle';
import { cn } from '../../lib/utils';

/**
 * Props for the AuthLayout component
 */
interface AuthLayoutProps {
  /** Child components to render within the auth layout */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * AuthLayout provides a consistent layout for authentication-related pages
 * with branding on the left side and authentication forms on the right.
 * It's responsive, collapsing to a single column on mobile devices.
 */
const AuthLayout = ({ children, className }: AuthLayoutProps): JSX.Element => {
  // Access authentication state for auth-related checks or operations
  const { state } = useAuthContext();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Branding Section - Hidden on mobile */}
        <div className="relative hidden md:block md:w-2/5 lg:w-2/5 xl:w-2/5 bg-primary overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ backgroundImage: "url('/images/auth-background.jpg')" }}
            aria-hidden="true"
          ></div>
          
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-primary/90 to-primary/80 z-10"
            aria-hidden="true"
          ></div>
          
          {/* Branding Content */}
          <div className="relative h-full flex flex-col items-center justify-center text-white z-20 p-8">
            <div className="max-w-md text-center">
              <h1 className="text-3xl font-bold mb-6">Welcome to Engagerr</h1>
              <p className="text-lg mb-8">
                The platform that connects content creators with brands through comprehensive 
                analytics and relationship mapping.
              </p>
              <p className="text-md mb-6">
                Track your content across platforms, understand your true reach, and form valuable partnerships.
              </p>
              
              {/* Illustration - Only shown on larger screens */}
              <div className="hidden lg:block">
                <Image 
                  src="/images/auth-illustration.svg" 
                  alt="Content creators and brands collaborating" 
                  width={400} 
                  height={300}
                  className="mx-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Content Section */}
        <div className="flex flex-1 flex-col md:w-3/5 lg:w-3/5 xl:w-3/5">
          {/* Header with Logo and Theme Toggle */}
          <header className="flex items-center justify-between p-4 md:p-6 border-b">
            <Link href="/" className="flex items-center" aria-label="Go to homepage">
              <Image 
                src="/images/logo.svg" 
                alt="" 
                width={32} 
                height={32} 
                aria-hidden="true"
              />
              <span className="ml-2 font-bold text-xl text-primary dark:text-white">Engagerr</span>
            </Link>
            <ThemeToggle />
          </header>

          {/* Main Content Area */}
          <main className={cn(
            "flex-1 flex flex-col items-center justify-center p-6 md:p-8 lg:p-12", 
            className
          )}>
            <div className="w-full max-w-md mx-auto">
              {children}
            </div>
          </main>

          {/* Footer */}
          <Footer className="border-t mt-auto" />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;