import React from 'react'; // React v18.0+
import { Metadata } from 'next'; // Next.js v13.0+
import LoginForm from '../../../components/auth/LoginForm'; // LoginForm component

/**
 * Defines page-specific metadata for the login page
 * @returns {Metadata} Object containing title and description for the login page
 */
export const metadata: Metadata = {
  title: 'Login | Engagerr', // LD1: Define title as 'Login | Engagerr'
  description: 'Log in to your Engagerr account to access your dashboard, analytics, and partnerships', // LD1: Define description as 'Log in to your Engagerr account to access your dashboard, analytics, and partnerships'
};

/**
 * Server component that renders the login page
 * @returns {JSX.Element} The rendered login page component
 */
const LoginPage: React.FC = () => {
  return (
    <section className="flex items-center justify-center h-full">
      <div className="w-full max-w-md p-6 rounded-lg shadow-md bg-white">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-4">
          Welcome back!
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Log in to your Engagerr account to continue.
        </p>
        {/* LD1: Render the LoginForm component to handle authentication */}
        <LoginForm />
      </div>
    </section>
  );
};

export default LoginPage;