import React from 'react';
import { ChevronRight } from 'lucide-react'; // v0.279.0
import Link from 'next/link'; // ^14.0.0

import { Button } from '../ui/Button';
import { useWindowSize } from '../../hooks/useWindowSize';
import { cn } from '../../lib/utils';

/**
 * Represents a breadcrumb item for navigation
 */
interface BreadcrumbItem {
  label: string;
  href: string;
  active?: boolean;
}

/**
 * Props for the PageHeader component
 */
interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - A reusable page header component that displays the title of the current page
 * along with optional actions, breadcrumbs, or contextual description.
 * Provides consistent heading structure across both creator and brand interfaces.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}) => {
  const { width } = useWindowSize();
  const isMobile = width !== undefined && width < 768;

  return (
    <div className={cn('mb-8 space-y-4', className)}>
      {/* Breadcrumb navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex flex-wrap items-center text-sm text-gray-500">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.href}-${index}`}>
              {index > 0 && (
                <ChevronRight className="mx-2 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
              )}
              {crumb.active ? (
                <span className="font-medium text-gray-800" aria-current="page">{crumb.label}</span>
              ) : (
                <Link 
                  href={crumb.href}
                  className="hover:text-blue-600 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title and actions row */}
      <div className={cn(
        'flex items-start gap-4',
        isMobile ? 'flex-col' : 'flex-row justify-between'
      )}>
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <div className="text-gray-500 max-w-3xl">
              {description}
            </div>
          )}
        </div>

        {actions && (
          <div className={cn(
            'flex flex-wrap items-center gap-2',
            isMobile ? 'w-full justify-start' : 'flex-shrink-0'
          )}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;