import React, { useState, useEffect } from 'react'; // react v18.0+
import * as yup from 'yup'; // yup v1.2+
import { useForm } from '../../hooks/useForm'; // Custom form handling hook with validation and submission
import { useContent } from '../../hooks/useContent'; // Hook for content management operations
import { useContentRelationships } from '../../hooks/useContentRelationships'; // Hook for managing content relationships
import usePlatforms from '../../hooks/usePlatforms'; // Hook for accessing connected platforms
import { useToast } from '../../hooks/useToast'; // Hook for displaying toast notifications
import { ContentType, RelationshipType } from '../../types/content'; // Type definitions for content and relationships
import { PlatformType } from '../../types/platform'; // Type definitions for supported platforms
import Button from '../ui/Button'; // UI button component
import Input from '../ui/Input'; // UI input component
import Select from '../ui/Select'; // UI select dropdown component
import Form from '../forms/Form'; // Form container component
import FormField from '../forms/FormField'; // Form field component
import FormItem from '../forms/FormItem'; // Form item wrapper component
import FormLabel from '../forms/FormLabel'; // Form label component
import FormControl from '../forms/FormControl'; // Form control component
import FormMessage from '../forms/FormMessage'; // Form error message component

/**
 * Interface defining the props for the ContentAddForm component
 */
interface ContentAddFormProps {
  parentContentId?: string;
  onSuccess?: () => void;
  className?: string;
}

/**
 * Component for adding new content and establishing relationships
 */
const ContentAddForm: React.FC<ContentAddFormProps> = ({
  parentContentId,
  onSuccess,
  className,
}) => {
  // LD1: Destructure props including parentContentId, onSuccess, and className
  // LD1: Set up form schema validation using yup
  const formSchema = yup.object().shape({
    title: yup.string().required('Title is required'),
    description: yup.string().optional(),
    platformId: yup.string().required('Platform is required'),
    contentType: yup.mixed<ContentType>().oneOf(Object.values(ContentType)).required('Content Type is required'),
    url: yup.string().url('Must be a valid URL').required('URL is required'),
    externalId: yup.string().required('External ID is required'),
  });

  // LD1: Initialize form state using useForm hook with validation schema
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      platformId: '',
      contentType: ContentType.VIDEO,
      url: '',
      externalId: '',
    },
    validationSchema: formSchema,
  });

  // LD1: Fetch connected platforms using usePlatforms hook
  const { platforms, isLoading: isPlatformsLoading } = usePlatforms();

  // LD1: Fetch parent content data if parentContentId is provided
  // LD1: Get content creation function from useContent hook
  const { createContent } = useContent();

  // LD1: Get relationship creation function from useContentRelationships hook
  const { createRelationship } = useContentRelationships();

  // LD1: Set up toast notifications using useToast hook
  const { toast } = useToast();

  // LD1: Handle form submission to create content and optionally establish relationship
  const onSubmit = async (values: any) => {
    try {
      // Create the content item
      const newContent = await createContent({
        title: values.title,
        description: values.description,
        platformId: values.platformId,
        contentType: values.contentType,
        url: values.url,
        externalId: values.externalId,
      });

      // If parentContentId is provided, create a relationship
      if (parentContentId && newContent) {
        await createRelationship({
          sourceContentId: parentContentId,
          targetContentId: newContent.id,
          relationshipType: RelationshipType.CHILD,
        });
      }

      // Call onSuccess callback if provided
      onSuccess?.();
      toast.success('Content added successfully!');
    } catch (error: any) {
      toast.error('Failed to add content', error.message);
    }
  };

  // LD1: Render form with fields for title, description, platform, content type, URL, and parent relationship
  return (
    <Form form={form} onSubmit={onSubmit} className={className}>
      <FormField
        control={form.control}
        name="title"
        label="Title"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Enter content title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        label="Description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="Enter content description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="platformId"
        label="Platform"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>Platform</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">Select a platform</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.platformType} ({platform.handle})
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="contentType"
        label="Content Type"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>Content Type</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">Select content type</option>
                <option value="video">Video</option>
                <option value="post">Post</option>
                <option value="story">Story</option>
                <option value="reel">Reel</option>
                <option value="short">Short</option>
                <option value="tweet">Tweet</option>
                <option value="article">Article</option>
                <option value="podcast_episode">Podcast Episode</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="url"
        label="URL"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL</FormLabel>
            <FormControl>
              <Input placeholder="Enter content URL" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

       <FormField
        control={form.control}
        name="externalId"
        label="External ID"
        required
        render={({ field }) => (
          <FormItem>
            <FormLabel>External ID</FormLabel>
            <FormControl>
              <Input placeholder="Enter content External ID" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* LD1: Show loading state during submission */}
      <Button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Adding...' : 'Add Content'}
      </Button>
    </Form>
  );
};

export default ContentAddForm;