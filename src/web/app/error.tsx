'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle, AlertDescription, AlertIcon } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error monitoring service in production
    console.error('Application error:', error);
    
    // In a production environment, this would send the error to a monitoring service
    // if (process.env.NODE_ENV === 'production') {
    //   // sendToErrorMonitoring(error);
    // }
  }, [error]);

  // Format error message - show more details in development
  const errorMessage = 
    process.env.NODE_ENV === 'development' 
      ? `${error.message || 'An unexpected error occurred'}`
      : (error.message || 'An unexpected error occurred. Please try again later.');

  return (
    <div className={cn(
      "container mx-auto py-10 px-4 space-y-6",
    )}>
      <Alert variant="error">
        <AlertIcon variant="error" />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription>
          {process.env.NODE_ENV === 'development' ? (
            <div className="mt-2">
              <p>{errorMessage}</p>
              {error.stack && (
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs max-h-64">
                  {error.stack}
                </pre>
              )}
            </div>
          ) : (
            <p>{errorMessage}</p>
          )}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => reset()}>
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
        >
          Go Home
        </Button>
      </div>
    </div>
  );
}