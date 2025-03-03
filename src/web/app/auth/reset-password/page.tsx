import React from 'react'; // react v18.0+
import { Metadata } from 'next'; // next v14.0+
import ResetPasswordForm from '../../../components/auth/ResetPasswordForm'; // src/web/components/auth/ResetPasswordForm.tsx

/**
 * Defines page-specific metadata for the reset password page
 */
export const metadata: Metadata = {
  title: 'Reset Password | Engagerr',
  description: 'Reset your Engagerr account password using the link sent to your email',
};

/**
 * Server component that renders the reset password page
 */
const ResetPasswordPage = () => {
  return (
    <section className="flex items-center justify-center h-full">
      <div className="container flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password to reset your account.
        </p>
        <ResetPasswordForm />
      </div>
    </section>
  );
};

export default ResetPasswordPage;