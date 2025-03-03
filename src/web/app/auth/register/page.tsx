import React from 'react'; //  ^18.0.0
import { Metadata } from 'next'; //  ^14.0.0

import RegisterForm from '../../../components/auth/RegisterForm';
// Define metadata for the registration page
export const metadata: Metadata = {
  title: 'Register | Engagerr',
  description:
    'Create an Engagerr account as a content creator or brand to access the platform',
};

/**
 * Server component that renders the registration page
 * @returns {JSX.Element} The rendered registration page component
 */
const RegisterPage = (): JSX.Element => {
  return (
    <section className="flex items-center justify-center h-full">
      <div className="container max-w-md p-4 rounded-lg shadow-md bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-semibold text-center text-gray-800 dark:text-white mb-4">
          Create an Account
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          Join Engagerr as a content creator or brand.
        </p>
        <RegisterForm />
      </div>
    </section>
  );
};

export default RegisterPage;