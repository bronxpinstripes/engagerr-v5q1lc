import { AudienceDemographics, Category } from "@/types/creator";
import { PlatformType } from "@/types/platform";

// Enums
export enum MediaKitTemplateId {
  MINIMAL = "minimal",
  PROFESSIONAL = "professional",
  CREATIVE = "creative",
  ENTERPRISE = "enterprise"
}

export enum MediaKitElementType {
  PROFILE_SUMMARY = "profile_summary",
  PLATFORM_STATS = "platform_stats",
  AUDIENCE_DEMOGRAPHICS = "audience_demographics",
  CONTENT_SHOWCASE = "content_showcase",
  CASE_STUDIES = "case_studies",
  RATE_CARD = "rate_card",
  TESTIMONIALS = "testimonials"
}

export enum MediaKitExportFormat {
  PDF = "pdf",
  WEB_LINK = "web_link",
  IMAGE = "image"
}

// Interfaces
export interface MediaKitTemplate {
  id: MediaKitTemplateId;
  name: string;
  description: string;
  previewImage: string;
}

export interface MediaKitPlatformStat {
  platformId: string;
  platformType: PlatformType;
  platformIcon: string;
  handle: string;
  metricName: string; // e.g., Subscribers, Followers
  metricValue: number;
  isIncluded: boolean;
}

export interface MediaKitContentItem {
  contentId: string;
  title: string;
  platform: PlatformType;
  thumbnailUrl: string;
  metricValue: string; // e.g., 1.2M views
  url: string;
  isIncluded: boolean;
}

export interface MediaKitCaseStudy {
  id: string;
  title: string;
  brand: string;
  description: string;
  results: string;
  imageUrl?: string;
  isIncluded: boolean;
}

export interface MediaKitRateItem {
  id: string;
  service: string;
  description: string;
  price: string;
  isIncluded: boolean;
}

export interface MediaKitTestimonial {
  id: string;
  brand: string;
  personName: string;
  personTitle: string;
  quote: string;
  brandLogo?: string;
  isIncluded: boolean;
}

export interface MediaKit {
  id: string;
  creatorId: string;
  name: string;
  templateId: MediaKitTemplateId;
  coverImage?: string;
  elements: Record<MediaKitElementType, boolean>;
  creatorDetails: {
    name: string;
    bio: string;
    categories: Category[];
    photo: string;
    contact: string;
  };
  platformStats: MediaKitPlatformStat[];
  featuredContent: MediaKitContentItem[];
  audienceDemographics?: AudienceDemographics;
  caseStudies?: MediaKitCaseStudy[];
  rateCard?: MediaKitRateItem[];
  testimonials?: MediaKitTestimonial[];
  isPublic: boolean;
  publicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaKitFormData {
  name: string;
  templateId: MediaKitTemplateId;
  coverImage?: string; // File or string
  elements: Partial<Record<MediaKitElementType, boolean>>;
  creatorDetails: {
    name: string;
    bio: string;
    categories: Category[];
    photo: string; // File or string
    contact: string;
  };
  platformStats: Array<{
    platformId: string;
    isIncluded: boolean;
  }>;
  featuredContent: Array<{
    contentId: string;
    isIncluded: boolean;
  }>;
  caseStudies?: string[]; // IDs of case studies to include
  rateItems?: string[]; // IDs of rate items to include
  testimonials?: string[]; // IDs of testimonials to include
  isPublic: boolean;
}

export interface MediaKitExportOptions {
  format: MediaKitExportFormat;
  includeContactInfo: boolean;
  includeRateCard: boolean;
}

export interface MediaKitGeneratorState {
  currentStep: number;
  mediaKit: Partial<MediaKit>;
  isLoading: boolean;
  isSaving: boolean;
  isPreviewMode: boolean;
  hasUnsavedChanges: boolean;
  errors: Record<string, string>;
}

export interface GetMediaKitRequest {
  mediaKitId: string;
  creatorId?: string;
}

export interface GetMediaKitResponse {
  mediaKit: MediaKit;
}

export interface ListMediaKitsRequest {
  creatorId: string;
  limit?: number;
  offset?: number;
}

export interface ListMediaKitsResponse {
  mediaKits: Array<{
    id: string;
    name: string;
    templateId: MediaKitTemplateId;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
}