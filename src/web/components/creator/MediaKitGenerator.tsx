import React, { useState, useCallback } from 'react'; // React library for building the component // react v18.0+
import { useForm } from 'react-hook-form'; // Hook for form state management and validation // react-hook-form v7.0.0
import { zodResolver } from '@hookform/resolvers/zod'; // Zod schema resolver for react-hook-form // @hookform/resolvers/zod v3.0.0
import { z } from 'zod'; // Schema validation library // zod v3.0.0
import { Save, ArrowLeft, EyeIcon, Loader } from 'lucide-react'; // Icon components for UI elements // lucide-react v0.279.0

import { useMediaKit } from '../../hooks/useMediaKit'; // Custom hook for managing media kit data and operations
import { useToast } from '../../hooks/useToast'; // Hook for displaying toast notifications
import { useCreator } from '../../hooks/useCreator'; // Hook for accessing creator profile data
import { useAnalytics } from '../../hooks/useAnalytics'; // Hook for accessing analytics data for media kit
import {
  MediaKitTemplateId,
  MediaKitElementType,
  MediaKitExportFormat,
  type MediaKit,
  type MediaKitFormData,
} from '../../types/media-kit'; // Type definitions for media kit functionality
import { cn } from '../../lib/utils'; // Utility for conditionally joining class names
import Form from '../forms/Form'; // Form component for the media kit form
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '../forms/FormField'; // Form field components for form structure
import { Input } from '../ui/Input'; // Input component for text fields
import { Button } from '../ui/Button'; // Button component for form actions
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'; // Tab components for organizing sections of the form
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card'; // Card components for form sections
import { FileUpload } from '../ui/FileUpload'; // File upload component for media kit images
import { MediaKitTemplates } from './MediaKitTemplates'; // Component for template selection
import { MediaKitElements } from './MediaKitElements'; // Component for selecting and arranging media kit elements

/**
 * @description Interface for the props of the MediaKitGenerator component
 */
export interface MediaKitGeneratorProps {
  initialData?: MediaKit;
  onSave: (mediaKit: MediaKitFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

/**
 * @description Zod schema for validating media kit form data
 */
const mediaKitFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot exceed 50 characters.' }),
  templateId: z.nativeEnum(MediaKitTemplateId, {
    errorMap: () => ({ message: 'Please select a template.' }),
  }),
  coverImage: z.string().optional(),
  elements: z.record(z.boolean()).optional(),
  creatorDetails: z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot exceed 50 characters.' }),
    bio: z.string().max(200, { message: 'Bio cannot exceed 200 characters.' }).optional(),
    categories: z.array(z.string()).optional(),
    photo: z.string().optional(),
    contact: z.string().email({ message: 'Invalid email address.' }).optional(),
  }),
  platformStats: z.array(z.object({
    platformId: z.string(),
    isIncluded: z.boolean(),
  })).optional(),
  featuredContent: z.array(z.object({
    contentId: z.string(),
    isIncluded: z.boolean(),
  })).optional(),
  isPublic: z.boolean().default(false),
});

/**
 * @description Main component for creating and editing media kits
 * @param MediaKitGeneratorProps props
 * @returns JSX.Element Rendered media kit generator component
 */
const MediaKitGenerator: React.FC<MediaKitGeneratorProps> = ({ initialData, onSave, onCancel, isEditing }) => {
  // Get media kit related functions from useMediaKit hook
  const { createMediaKit, updateMediaKit } = useMediaKit();

  // Get creator data from useCreator hook
  const { creator } = useCreator();

  // Get analytics data from useAnalytics hook
  const { aggregateMetrics } = useAnalytics();

  // Get toast functionality from useToast hook
  const { toast } = useToast();

  // Set up form with react-hook-form and zodResolver for validation
  const form = useForm<MediaKitFormData>({
    resolver: zodResolver(mediaKitFormSchema),
    defaultValues: {
      name: initialData?.name || `${creator?.user.fullName}'s Media Kit` || '',
      templateId: initialData?.templateId || MediaKitTemplateId.PROFESSIONAL,
      coverImage: initialData?.coverImage || '',
      elements: initialData?.elements || {},
      creatorDetails: initialData?.creatorDetails || {
        name: creator?.user.fullName || '',
        bio: creator?.bio || '',
        categories: creator?.categories || [],
        photo: creator?.profileImage || '',
        contact: creator?.user.email || '',
      },
      platformStats: initialData?.platformStats || [],
      featuredContent: initialData?.featuredContent || [],
      isPublic: initialData?.isPublic || false,
    },
    mode: 'onChange',
  });

  // Initialize state variables (activeTab, isPreviewMode, isSaving)
  const [activeTab, setActiveTab] = useState<string>('template');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Implement form submission handler to save media kit
  const onSubmit = async (data: MediaKitFormData) => {
    setIsSaving(true);
    try {
      if (isEditing && initialData?.id) {
        await updateMediaKit(initialData.id, data);
        toast({
          title: 'Media kit updated successfully.',
        });
      } else {
        await createMediaKit(data);
        toast({
          title: 'Media kit created successfully.',
        });
      }
      onSave(data);
    } catch (error: any) {
      toast({
        title: 'Failed to save media kit.',
        description: error.message,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Implement preview toggle functionality
  const togglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
  };

  // Define types for step components
  interface StepProps {
    form: typeof form;
    onNext: () => void;
    onPrevious: () => void;
  }

  // Template Step Component
  const TemplateStep: React.FC<StepProps> = ({ form, onNext }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a Template</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaKitTemplates
            selectedTemplate={form.watch('templateId')}
            onSelectTemplate={(templateId: MediaKitTemplateId) => {
              form.setValue('templateId', templateId);
              onNext();
            }}
          />
        </CardContent>
      </Card>
    );
  };

  // Details Step Component
  const DetailsStep: React.FC<StepProps> = ({ form, onNext, onPrevious }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enter Creator Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="creatorDetails.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Creator Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="creatorDetails.bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Input placeholder="Creator Bio" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="creatorDetails.contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input placeholder="Contact Email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Image</FormLabel>
                <FormControl>
                  <FileUpload
                    accept="image/*"
                    onChange={(file: File | null) => {
                      field.onChange(file ? URL.createObjectURL(file) : '');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter>
          <StepNavigation
            currentStep={2}
            totalSteps={4}
            onNext={onNext}
            onPrevious={onPrevious}
            form={form}
            isSaving={isSaving}
          />
        </CardFooter>
      </Card>
    );
  };

  // Elements Step Component
  const ElementsStep: React.FC<StepProps> = ({ form, onNext, onPrevious }) => {
    const selectedElements = Object.entries(form.watch('elements') || {})
      .filter(([, value]) => value)
      .map(([key]) => key);

    const handleElementsChange = (elements: MediaKitElementType[]) => {
      form.setValue('elements', elements.reduce((acc: any, element) => {
        acc[element] = true;
        return acc;
      }, {}));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Media Kit Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaKitElements
            selectedElements={selectedElements}
            onElementsChange={handleElementsChange}
          />
        </CardContent>
        <CardFooter>
          <StepNavigation
            currentStep={3}
            totalSteps={4}
            onNext={onNext}
            onPrevious={onPrevious}
            form={form}
            isSaving={isSaving}
          />
        </CardFooter>
      </Card>
    );
  };

  // Content Step Component
  const ContentStep: React.FC<StepProps> = ({ form, onNext, onPrevious }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Featured Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Content Selection</div>
        </CardContent>
        <CardFooter>
          <StepNavigation
            currentStep={4}
            totalSteps={4}
            onNext={onNext}
            onPrevious={onPrevious}
            form={form}
            isSaving={isSaving}
          />
        </CardFooter>
      </Card>
    );
  };

  // Preview Media Kit Component
  const PreviewMediaKit: React.FC<{ data: MediaKitFormData }> = ({ data }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Kit Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Preview Content</div>
        </CardContent>
      </Card>
    );
  };

  // Step Navigation Component
  interface StepNavigationProps {
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrevious: () => void;
    onSave: () => void;
    isSaving: boolean;
    form: any;
  }

  const StepNavigation: React.FC<StepNavigationProps> = ({ currentStep, totalSteps, onNext, onPrevious, isSaving, form }) => {
    return (
      <div className="flex justify-between">
        {currentStep > 1 && (
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {currentStep < totalSteps ? (
          <Button onClick={() => form.handleSubmit(onNext)()}>Next</Button>
        ) : (
          <Button type="submit" disabled={isSaving} onClick={() => form.handleSubmit(onSubmit)()}>
            {isSaving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={cn('container relative', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mx-auto w-full md:w-[400px]">
          <TabsTrigger value="template" disabled={isPreviewMode}>
            Template
          </TabsTrigger>
          <TabsTrigger value="details" disabled={isPreviewMode}>
            Details
          </TabsTrigger>
          <TabsTrigger value="elements" disabled={isPreviewMode}>
            Elements
          </TabsTrigger>
          <TabsTrigger value="content" disabled={isPreviewMode}>
            Content
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          {isPreviewMode ? (
            <PreviewMediaKit data={form.getValues()} />
          ) : (
            <Form form={form} onSubmit={onSubmit}>
              <TabsContent value="template" className="space-y-4">
                <TemplateStep
                  form={form}
                  onNext={() => setActiveTab('details')}
                />
              </TabsContent>
              <TabsContent value="details" className="space-y-4">
                <DetailsStep
                  form={form}
                  onNext={() => setActiveTab('elements')}
                  onPrevious={() => setActiveTab('template')}
                />
              </TabsContent>
              <TabsContent value="elements" className="space-y-4">
                <ElementsStep
                  form={form}
                  onNext={() => setActiveTab('content')}
                  onPrevious={() => setActiveTab('details')}
                />
              </TabsContent>
              <TabsContent value="content" className="space-y-4">
                <ContentStep
                  form={form}
                  onNext={() => setActiveTab('content')}
                  onPrevious={() => setActiveTab('elements')}
                />
              </TabsContent>
            </Form>
          )}
        </div>
      </Tabs>
      <div className="absolute top-2 right-2">
        <Button variant="ghost" size="icon" onClick={togglePreviewMode}>
          {isPreviewMode ? (
            <span>Edit</span>
          ) : (
            <>
              <EyeIcon className="mr-2 h-4 w-4" />
              Preview
            </>
          )}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default MediaKitGenerator;