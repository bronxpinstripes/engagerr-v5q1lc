"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Link as LinkIcon, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  BarChart2, 
  DollarSign 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types for the content data
interface ContentItem {
  id: string;
  creatorId: string;
  platformId: string;
  externalId: string;
  title: string;
  description: string;
  contentType: string;
  publishedAt: string;
  url: string;
  thumbnail: string;
  views: number;
  engagements: number;
  engagementRate: number;
  shares: number;
  comments: number;
  estimatedValue: number;
  isRoot: boolean;
  platform: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface ContentResponse {
  data: {
    content: ContentItem[];
    pagination: PaginationData;
  };
  meta: {
    timestamp: string;
  };
}

// Helper functions for formatting
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
};

export default function ContentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = params.contentId as string;
  const page = Number(searchParams.get("page") || 1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [contentData, setContentData] = useState<ContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch from the API
    // For this example, we'll use the provided JSON data
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Simulating an API call with the provided data
        const mockResponse: ContentResponse = {
          data: {
            content: [
              {
                id: "content-123",
                creatorId: "creator-456",
                platformId: "platform-789",
                externalId: "yt-abc123",
                title: "How to Build a Content Strategy",
                description: "A comprehensive guide to content strategy across platforms",
                contentType: "VIDEO",
                publishedAt: "2023-10-10T14:30:00Z",
                url: "https://youtube.com/watch?v=abc123",
                thumbnail: "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
                views: 125432,
                engagements: 23541,
                engagementRate: 18.77,
                shares: 4253,
                comments: 1875,
                estimatedValue: 2340.5,
                isRoot: true,
                platform: "YOUTUBE",
                createdAt: "2023-10-10T14:35:22Z",
                updatedAt: "2023-10-16T08:15:43Z"
              }
            ],
            pagination: {
              page: 1,
              limit: 20,
              totalItems: 42,
              totalPages: 3
            }
          },
          meta: {
            timestamp: "2023-10-16T12:30:45Z"
          }
        };
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setContentData(mockResponse);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching content data:", err);
        setError("Failed to load content data. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contentId, page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (contentData && newPage > contentData.data.pagination.totalPages)) {
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/content/${contentId}?${params.toString()}`);
  };

  const contentItem = contentData?.data.content[0];
  const pagination = contentData?.data.pagination;

  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <div className="w-full h-8 mb-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-64 w-full rounded-md" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-24 w-full rounded-md" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-medium text-red-800">Error Loading Content</h2>
              <p className="text-red-600">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If content data hasn't loaded yet, return null
  if (!contentItem || !pagination) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
      {/* Breadcrumb navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/content">Content</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>{contentItem.title.substring(0, 20)}...</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-sm capitalize bg-blue-50">
                  {contentItem.platform.toLowerCase()}
                </Badge>
                <Badge variant="outline" className="text-sm capitalize bg-gray-50">
                  {contentItem.contentType.toLowerCase()}
                </Badge>
                {contentItem.isRoot && (
                  <Badge className="bg-purple-500 hover:bg-purple-600">Parent Content</Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-bold">{contentItem.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(contentItem.publishedAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a 
                    href={contentItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Original
                  </a>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Analytics
              </Button>
              <Button size="sm">
                Map Relationships
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="relative aspect-video rounded-md overflow-hidden border bg-gray-100">
                <Image
                  src={contentItem.thumbnail}
                  alt={contentItem.title}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="mt-4 text-gray-700">{contentItem.description}</p>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <span>Last updated: {format(new Date(contentItem.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <TooltipProvider>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Views</p>
                            <h4 className="text-xl font-bold">{formatNumber(contentItem.views)}</h4>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <BarChart2 className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total number of views for this content piece</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Engagements</p>
                            <h4 className="text-xl font-bold">{formatNumber(contentItem.engagements)}</h4>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <BarChart2 className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Total engagements (likes, reactions, etc.)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Comments</p>
                            <h4 className="text-xl font-bold">{formatNumber(contentItem.comments)}</h4>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <BarChart2 className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of comments on this content</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-5 w-5 text-indigo-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Shares</p>
                            <h4 className="text-xl font-bold">{formatNumber(contentItem.shares)}</h4>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <BarChart2 className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Number of times this content was shared</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipProvider>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Card className="border-blue-100 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Engagement Rate</p>
                        <h4 className="text-xl font-bold text-blue-900">{contentItem.engagementRate.toFixed(1)}%</h4>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Heart className="h-4 w-4 text-blue-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-100 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Estimated Value</p>
                        <h4 className="text-xl font-bold text-green-900">{formatCurrency(contentItem.estimatedValue)}</h4>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-700" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-lg font-semibold mb-4">Related Content</h3>
                <div className="text-center py-4 text-gray-500">
                  <p>No child content found for this item.</p>
                  <Button variant="outline" className="mt-2">Map New Relationship</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">
          Showing {((pagination.page - 1) * pagination.limit) + 1}-
          {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems} items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}