import React from 'react'; // react v18.0+
import { useForm } from 'react-hook-form'; // ^7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // ^3.1.0
import { z } from 'zod'; // ^3.22.0

import DashboardLayout from '../../../components/layout/DashboardLayout';
import PageHeader from '../../../components/layout/PageHeader';
import Form from '../../../components/forms/Form';
import FormField from '../../../components/forms/FormField';
import FormItem from '../../../components/forms/FormItem';
import FormLabel from '../../../components/forms/FormLabel';
import FormControl from '../../../components/forms/FormControl';
import FormMessage from '../../../components/forms/FormMessage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';
import FileUpload from '../../../components/ui/FileUpload';
import { brandProfileSchema } from '../../../lib/validators';
import useBrand from '../../../hooks/useBrand';
import useToast from '../../../hooks/useToast';
import { BrandProfileType } from '../../../types/brand';

/**
 * Server component that renders the brand profile settings page
 * @returns {JSX.Element} The rendered profile settings page component
 */
const ProfilePage = (): JSX.Element => {
  // Fetch the current brand profile data using the useBrand hook
  const { brandProfile, updateBrand, profileLoading } = useBrand();

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<BrandProfileType>({
    resolver: zodResolver(brandProfileSchema),
    defaultValues: brandProfile || {
      companyName: '',
      description: '',
      industries: [],
      logoImage: '',
      coverImage: '',
      websiteUrl: '',
      socialLinks: {},
      location: '',
      size: '',
      founded: 0,
      contactEmail: '',
      contactPhone: '',
      brandValues: [],
    },
    mode: 'onChange',
  });

  // Set up toast notifications using useToast
  const { toast } = useToast();

  /**
   * Handles form submission to update brand profile
   * @param {BrandProfileType} formData - The data from the form
   * @returns {Promise<void>} A promise that resolves when the update is complete
   */
  const onSubmit = async (formData: BrandProfileType): Promise<void> => {
    try {
      // Set loading state to true
      form.setValue('companyName', formData.companyName);
      form.setValue('description', formData.description);
      form.setValue('industries', formData.industries);
      form.setValue('websiteUrl', formData.websiteUrl);
      form.setValue('contactEmail', formData.contactEmail);
      
      // Call the updateProfile function from useBrand hook
      await updateBrand(formData);

      // Display success toast notification on successful update
      toast({
        title: 'Profile Updated',
        description: 'Your brand profile has been updated successfully.',
      });
    } catch (error: any) {
      // Handle and display any errors that occur during update
      toast({
        title: 'Error',
        description: error.message || 'Failed to update brand profile.',
        type: 'error',
      });
    }
  };

  // Render the profile form with input fields for all brand details
  return (
    <DashboardLayout>
      <PageHeader title="Brand Profile" description="Manage your brand's public profile information." />
      <Card>
        <Form form={form} onSubmit={onSubmit}>
          <FormField
            control={form.control}
            name="companyName"
            label="Company Name"
            rules={{ required: 'Company name is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            label="Description"
            rules={{ required: 'Description is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your company description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industries"
            label="Industries"
            rules={{ required: 'Industry is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industries</FormLabel>
                <FormControl>
                  <Select
                    placeholder="Select industries"
                    options={[
                      { value: 'technology', label: 'Technology' },
                      { value: 'fashion', label: 'Fashion' },
                      { value: 'beauty', label: 'Beauty' },
                      { value: 'health', label: 'Health' },
                      { value: 'fitness', label: 'Fitness' },
                    ]}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="websiteUrl"
            label="Website URL"
            rules={{ required: 'Website URL is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your website URL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            label="Contact Email"
            rules={{ required: 'Contact email is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your contact email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoImage"
            label="Logo Image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo Image</FormLabel>
                <FormControl>
                  <FileUpload
                    accept="image/*"
                    onChange={(file: any) => field.onChange(file)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={profileLoading}>
            {profileLoading ? 'Updating...' : 'Update Profile'}
          </Button>
        </Form>
      </Card>
    </DashboardLayout>
  );
};

export default ProfilePage;