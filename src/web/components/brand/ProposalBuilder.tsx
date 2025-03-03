import React, { useState, useEffect } from 'react'; // version: ^18.0.0
import { useForm } from 'react-hook-form'; // version: ^7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // version: ^3.1.0
import { Plus, Trash, Calendar, DollarSign, FileText } from 'lucide-react'; // version: ^0.279.0

import Form from '../forms/Form';
import FormField from '../forms/FormField';
import FormItem from '../forms/FormItem';
import FormLabel from '../forms/FormLabel';
import FormControl from '../forms/FormControl';
import FormMessage from '../forms/FormMessage';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { PartnershipProposal } from '../shared/PartnershipProposal';
import useFormHook from '../../hooks/useForm';
import { usePartnerships } from '../../hooks/usePartnerships';
import { useBrand } from '../../hooks/useBrand';
import { useToast } from '../../hooks/useToast';
import { partnershipProposalSchema } from '../../lib/validators';
import { formatCurrency } from '../../lib/formatters';
import { PlatformType } from '../../types/platform';
import { ContentType } from '../../types/content';
import { ProposalType } from '../../types/partnership';

/**
 * A React component that provides a form interface for brands to create and edit partnership proposals for creators.
 * It handles campaign details, deliverables, compensation, and terms configuration with validation and submission to the API.
 * @param {string} creatorId - The ID of the creator to whom the proposal is being sent.
 * @param {string | undefined} campaignId - The ID of the campaign to which the proposal belongs (optional).
 * @param {object | undefined} initialData - Initial data to populate the form (optional).
 * @param {function} onSuccess - Callback function to execute upon successful proposal creation/update.
 * @returns {JSX.Element} The rendered ProposalBuilder component.
 */
export const ProposalBuilder: React.FC<{
  creatorId: string;
  campaignId?: string;
  initialData?: any;
  onSuccess: () => void;
}> = ({ creatorId, campaignId, initialData, onSuccess }) => {
  // LD1: Initialize form with react-hook-form and partnershipProposalSchema validation schema
  const form = useFormHook({
    defaultValues: {
      brandId: '',
      creatorId: creatorId,
      campaignId: campaignId || '',
      title: '',
      description: '',
      deliverables: [{ platformType: PlatformType.INSTAGRAM, contentType: ContentType.POST, description: '', requirements: '', dueDate: new Date(), price: 0 }],
      budget: 0,
      startDate: new Date(),
      endDate: new Date(),
      termsAndConditions: '',
      proposalType: ProposalType.BRAND_INITIATED,
    },
    validationSchema: partnershipProposalSchema,
    mode: 'onSubmit',
  });

  // LD1: Access brand context to get brand information
  const { brand } = useBrand();

  // LD1: Access partnerships hook for creating proposals
  const { createProposal } = usePartnerships();

  // LD1: Set up toast notifications for feedback
  const toast = useToast();

  // LD1: Initialize state for preview mode toggle
  const [isPreview, setIsPreview] = useState(false);

  // LD1: Initialize state for deliverables list with an empty first item
  const [deliverables, setDeliverables] = useState([
    { platformType: PlatformType.INSTAGRAM, contentType: ContentType.POST, description: '', requirements: '', dueDate: new Date(), price: 0 },
  ]);

  // LD1: Set default form values from initialData or with sensible defaults
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      setDeliverables(initialData.deliverables);
    } else {
      form.setValue('creatorId', creatorId);
      form.setValue('brandId', brand?.id || '');
      form.setValue('campaignId', campaignId || '');
    }
  }, [initialData, creatorId, campaignId, brand?.id, form]);

  // LD1: Handle form submission to create or update proposal
  const onSubmit = async (values: any) => {
    try {
      // LD1: Call createProposal mutation with form values
      await createProposal({
        brandId: brand?.id || '',
        creatorId: creatorId,
        campaignId: values.campaignId,
        title: values.title,
        description: values.description,
        deliverables: values.deliverables,
        budget: values.budget,
        startDate: values.startDate,
        endDate: values.endDate,
        termsAndConditions: values.termsAndConditions,
        proposalType: ProposalType.BRAND_INITIATED,
      });

      // LD1: Display success toast and execute onSuccess callback
      toast.success('Proposal created successfully!');
      onSuccess();
    } catch (error: any) {
      // LD1: Display error toast with error message
      toast.error('Failed to create proposal', error.message);
    }
  };

  // LD1: Implement handler to add new deliverable items to the form
  const handleAddDeliverable = () => {
    setDeliverables([
      ...deliverables,
      { platformType: PlatformType.INSTAGRAM, contentType: ContentType.POST, description: '', requirements: '', dueDate: new Date(), price: 0 },
    ]);
  };

  // LD1: Implement handler to remove deliverable items from the form
  const handleRemoveDeliverable = (index: number) => {
    const newDeliverables = [...deliverables];
    newDeliverables.splice(index, 1);
    setDeliverables(newDeliverables);
  };

  // LD1: Implement handler to toggle preview mode
  const handleTogglePreview = () => {
    setIsPreview(!isPreview);
  };

  // LD1: Calculate total budget based on deliverable prices
  const totalBudget = deliverables.reduce((sum, deliverable) => sum + deliverable.price, 0);

  // LD1: Render Form component with campaign details section
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="md:w-1/2">
        <Form {...form} onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                label="Proposal Title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter proposal title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                label="Proposal Description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter proposal description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* LD1: Render deliverables section with dynamic fields for each platform and content type */}
              {deliverables.map((deliverable, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDeliverable(index)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.platformType`}
                    label="Platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <option value={PlatformType.INSTAGRAM}>Instagram</option>
                            <option value={PlatformType.YOUTUBE}>YouTube</option>
                            <option value={PlatformType.TIKTOK}>TikTok</option>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.contentType`}
                    label="Content Type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <option value={ContentType.POST}>Post</option>
                            <option value={ContentType.VIDEO}>Video</option>
                            <option value={ContentType.STORY}>Story</option>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.description`}
                    label="Description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter deliverable description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.requirements`}
                    label="Requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter deliverable requirements" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.dueDate`}
                    label="Due Date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            onDateChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliverables.${index}.price`}
                    label="Price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter deliverable price"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={handleAddDeliverable}>
                <Plus className="h-4 w-4 mr-2" />
                Add Deliverable
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* LD1: Render compensation section with budget breakdown */}
              <div>
                <FormLabel>Total Budget</FormLabel>
                <div className="text-lg font-semibold">{formatCurrency(totalBudget)}</div>
              </div>
              <FormField
                control={form.control}
                name="termsAndConditions"
                label="Terms and Conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter terms and conditions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* LD1: Render timeline section with start and end date pickers */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  label="Start Date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  label="End Date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <CardFooter className="flex justify-between">
            {/* LD1: Render action buttons for saving or previewing proposal */}
            <Button type="button" variant="secondary" onClick={handleTogglePreview}>
              {isPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Submitting...' : 'Submit Proposal'}
            </Button>
          </CardFooter>
        </Form>
      </div>

      {/* LD1: Conditionally render proposal preview when in preview mode */}
      {isPreview && (
        <div className="md:w-1/2">
          <PartnershipProposal proposal={form.getValues()} isPreview={true} />
        </div>
      )}
    </div>
  );
};