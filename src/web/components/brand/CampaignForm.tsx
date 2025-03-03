import React, { useState, useEffect } from 'react'; // version: ^18.0.0
import { useRouter } from 'next/navigation'; // v14.0.0
import * as yup from 'yup'; // version: ^1.2.0
import Form from '../../components/forms/Form';
import FormField from '../../components/forms/FormField';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker';
import FileUpload from '../../components/ui/FileUpload';
import { cn } from '../../lib/utils';
import useForm from '../../hooks/useForm';
import useCampaigns from '../../hooks/useCampaigns';
import useBrand from '../../hooks/useBrand';
import useToast from '../../hooks/useToast';
import { CampaignFormValues, Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../../types/form';
import { API_ROUTES } from '../../lib/constants';

/**
 * Interface defining the props for the CampaignForm component
 */
interface CampaignFormProps {
  initialData?: Campaign | null;
  onSuccess?: (campaign: Campaign) => void;
  className?: string;
}

/**
 * Yup validation schema for campaign form validation
 */
function createCampaignSchema() {
  return yup.object({
    name: yup.string()
      .required('Campaign name is required')
      .min(3, 'Campaign name must be at least 3 characters')
      .max(50, 'Campaign name cannot exceed 50 characters'),
    description: yup.string()
      .required('Campaign description is required')
      .max(200, 'Campaign description cannot exceed 200 characters'),
    startDate: yup.date()
      .required('Start date is required'),
    endDate: yup.date()
      .required('End date is required')
      .min(yup.ref('startDate'), 'End date must be after start date'),
    budget: yup.number()
      .required('Budget is required')
      .min(1, 'Budget must be at least $1'),
    targetCreatorCount: yup.number()
      .required('Target creator count is required')
      .min(1, 'Target creator count must be at least 1'),
    keyMessages: yup.array().of(yup.string()).optional(),
    coverImage: yup.mixed().optional(),
  });
}

/**
 * A form component for creating and editing brand marketing campaigns
 */
const CampaignForm: React.FC<CampaignFormProps> = ({ initialData, onSuccess, className }) => {
  // Destructure props to get initialData, onSuccess, and className
  const router = useRouter();

  // Get brand information from useBrand hook
  const { brandId } = useBrand();

  // Set up toast notification system
  const { toast } = useToast();

  // Initialize form validation schema
  const validationSchema = createCampaignSchema();

  // Set up form with useForm hook, providing validation schema and default values
  const form = useForm<CampaignFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || new Date(),
      budget: initialData?.totalBudget || 0,
      targetCreatorCount: initialData?.targetCreatorCount || 0,
      keyMessages: initialData?.keyMessages || [],
    },
    validationSchema: validationSchema,
    mode: 'onSubmit',
  });

  // Get campaign management functions from useCampaigns hook
  const { createCampaign, updateCampaign } = useCampaigns();

  /**
   * Handles form submission for creating or updating a campaign
   */
  const handleSubmit = async (values: CampaignFormValues) => {
    // Determine if creating new campaign or updating existing one
    const isCreate = !initialData;

    // Prepare form data for API request
    const formData = {
      name: values.name,
      description: values.description,
      startDate: values.startDate,
      endDate: values.endDate,
      totalBudget: values.budget,
      targetCreatorCount: values.targetCreatorCount,
      keyMessages: values.keyMessages,
      coverImage: '', // TODO: Implement cover image upload
      isPublic: true, // TODO: Implement isPublic toggle
    };

    try {
      let campaign: Campaign;

      if (isCreate) {
        // For new campaign: call createCampaign with form data
        if (!brandId) {
          throw new Error('Brand ID is required to create a campaign');
        }
        campaign = await createCampaign({ ...formData, brandId: brandId } as CreateCampaignRequest);
      } else {
        // For existing campaign: call updateCampaign with campaign ID and form data
        campaign = await updateCampaign(initialData.id, formData as UpdateCampaignRequest);
      }

      // Show success toast notification on successful submission
      toast.success(`Campaign ${isCreate ? 'created' : 'updated'} successfully!`);

      // Call onSuccess callback with created/updated campaign data if provided
      onSuccess?.(campaign);

      if (isCreate) {
        // Navigate to campaign detail page if creating new campaign
        router.push(`/brand/campaigns/${campaign.id}`);
      }
    } catch (err: any) {
      // Handle errors with error toast notification
      toast.error('Form submission failed', err.message || 'An unexpected error occurred');
    }
  };

  return (
    <Form form={form} onSubmit={handleSubmit} className={className}>
      <FormField
        control={form.control}
        name="name"
        label="Campaign Name"
        required
        render={({ field }) => (
          <Input placeholder="Enter campaign name" {...field} />
        )}
      />
      <FormField
        control={form.control}
        name="description"
        label="Description"
        required
        render={({ field }) => (
          <Input placeholder="Enter campaign description" {...field} />
        )}
      />
      <FormField
        control={form.control}
        name="startDate"
        label="Start Date"
        required
        render={({ field }) => (
          <DatePicker
            date={field.value}
            onDateChange={field.onChange}
            placeholder="Select start date"
          />
        )}
      />
      <FormField
        control={form.control}
        name="endDate"
        label="End Date"
        required
        render={({ field }) => (
          <DatePicker
            date={field.value}
            onDateChange={field.onChange}
            placeholder="Select end date"
          />
        )}
      />
      <FormField
        control={form.control}
        name="budget"
        label="Budget"
        required
        render={({ field }) => (
          <Input
            type="number"
            placeholder="Enter budget"
            {...field}
          />
        )}
      />
      <FormField
        control={form.control}
        name="targetCreatorCount"
        label="Target Creator Count"
        required
        render={({ field }) => (
          <Input
            type="number"
            placeholder="Enter target creator count"
            {...field}
          />
        )}
      />
      {/* TODO: Implement key messages and cover image upload */}
      <Button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </Form>
  );
};

export default CampaignForm;