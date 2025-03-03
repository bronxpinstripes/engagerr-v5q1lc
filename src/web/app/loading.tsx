'use client';

import React from 'react';
import Skeleton from 'components/ui/Skeleton';
import { Card, CardHeader, CardContent } from 'components/ui/Card';
import { useTheme } from 'context/ThemeContext';

/**
 * Main loading component displayed during page transitions and data fetching
 * operations throughout the Engagerr platform. Creates a visual skeleton of
 * the expected content to improve perceived performance.
 */
export default function Loading() {
  // Access theme context to ensure loading state matches current theme
  const { theme } = useTheme();
  
  return (
    <div className="w-full h-full space-y-6" aria-busy="true" aria-label="Loading content">
      {/* Page header skeleton */}
      <div className="w-full flex flex-col gap-2">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-5 w-1/2" />
      </div>

      {/* Main content grid - responsive layout that adjusts columns based on screen size */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* First card - metrics/stats */}
        <Card>
          <CardHeader className="pb-0">
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-16 w-24" />
              <Skeleton className="h-16 w-24" />
              <Skeleton className="h-16 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Second card - graph/chart */}
        <Card>
          <CardHeader className="pb-0">
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
            <div className="flex justify-between mt-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
            </div>
          </CardContent>
        </Card>

        {/* Third card - circle chart or profile */}
        <Card>
          <CardHeader className="pb-0">
            <Skeleton className="h-7 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center">
              <Skeleton className="h-32 w-32" variant="circle" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content relationship map skeleton - key feature of the platform */}
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-7 w-1/4 mb-2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-10 w-40" />
            <div className="flex justify-center gap-8 w-full">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex justify-around gap-4 w-full">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table or list skeleton */}
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-7 w-1/4 mb-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table header */}
            <div className="flex gap-4 pb-2">
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/6" />
            </div>
            {/* Table rows */}
            {Array(5).fill(null).map((_, index) => (
              <div key={index} className="flex gap-4">
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
                <Skeleton className="h-8 w-1/6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}