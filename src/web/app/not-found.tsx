import Link from 'next/link';
import { FolderX } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16 text-center">
      <FolderX className="h-24 w-24 text-gray-400 mb-6" aria-hidden="true" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild variant="primary" size="lg">
        <Link href="/">
          Back to Home
        </Link>
      </Button>
    </div>
  );
}