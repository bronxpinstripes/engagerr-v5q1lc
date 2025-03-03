import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // v7.45+
import { zodResolver } from '@hookform/resolvers/zod'; // v3.22+
import { z } from 'zod'; // v3.22+
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../forms/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import FileUpload from '../ui/FileUpload';
import { Select } from '../ui/Select';
import {
  UserType,
} from '../../types/user';
import {
  Category,
} from '../../types/creator';
import {
  Industry,
} from '../../types/brand';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useCreator } from '../../hooks/useCreator';
import useBrand from '../../hooks/useBrand';
import { useToast } from '../../hooks/useToast';

/**
 * Interface for profile form values with conditional fields based on user type
 */
interface ProfileFormValues {
  name: string;
  email: string;
  bio?: string;
  categories?: Category[];
  companyName?: string;
  industries?: Industry[];
  websiteUrl?: string;
}

/**
 * Props for the ProfileManager component
 */
interface ProfileManagerProps {
  className?: string;
}

/**
 * Returns the appropriate Zod validation schema based on the user type
 * @param userType The type of user (creator or brand)
 * @returns Zod schema for validating profile form data
 */
const getProfileFormSchema = (userType: string) => {
  // Create base schema with common fields (name, email)
  let schema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Invalid email format." }),
  });

  // If userType is CREATOR, extend schema with creator-specific fields (bio, categories)
  if (userType === UserType.CREATOR) {
    schema = schema.extend({
      bio: z.string().max(160, { message: "Bio must be less than 160 characters." }).optional(),
      categories: z.array(z.nativeEnum(Category)).optional(),
    });
  }

  // If userType is BRAND, extend schema with brand-specific fields (companyName, industries, websiteUrl)
  if (userType === UserType.BRAND) {
    schema = schema.extend({
      companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
      industries: z.array(z.nativeEnum(Industry)).optional(),
      websiteUrl: z.string().url({ message: "Invalid URL format." }).optional(),
    });
  }

  // Return the complete schema based on user type
  return schema;
};

/**
 * Formats category strings into an array format for API submission
 * @param categoriesString Comma-separated categories string
 * @returns Array of category enum values
 */
const formatCategories = (categoriesString: string): Category[] => {
  // Take the comma-separated categories string
  // Split the string by commas
  const categoriesArray = categoriesString.split(',');

  // Trim whitespace from each category
  const trimmedCategories = categoriesArray.map(category => category.trim());

  // Map string values to Category enum values
  const categoryEnumValues = trimmedCategories.map(category => Category[category as keyof typeof Category]);

  // Filter out any invalid categories
  const validCategories = categoryEnumValues.filter(category => typeof category === 'string');

  // Return the array of categories
  return validCategories as Category[];
};

/**
 * Formats industry strings into an array format for API submission
 * @param industriesString Comma-separated industries string
 * @returns Array of industry enum values
 */
const formatIndustries = (industriesString: string): Industry[] => {
  // Take the comma-separated industries string
  // Split the string by commas
  const industriesArray = industriesString.split(',');

  // Trim whitespace from each industry
  const trimmedIndustries = industriesArray.map(industry => industry.trim());

  // Map string values to Industry enum values
  const industryEnumValues = trimmedIndustries.map(industry => Industry[industry as keyof typeof Industry]);

  // Filter out any invalid industries
  const validIndustries = industryEnumValues.filter(industry => typeof industry === 'string');

  // Return the array of industries
  return validIndustries as Industry[];
};

/**
 * A component that manages user profile information with appropriate fields based on user type
 * @param props Component properties
 * @returns Profile management interface with form
 */
const ProfileManager: React.FC<ProfileManagerProps> = ({ className }) => {
  // Get user information and type from authentication context using useAuth hook
  const { user, getUserType } = useAuth();

  // Determine if user is creator or brand to get appropriate data from useCreator or useBrand
  const userType = getUserType(user);
  const { creator, profile, updateProfile, uploadProfileImage, updateCategories, isLoading: creatorLoading } = useCreator();
  const { brandProfile, updateBrand, profileLoading: brandLoading } = useBrand();

  // Create state for managing profile image uploads and upload progress
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create form schema using getProfileFormSchema based on user type
  const formSchema = getProfileFormSchema(userType);

  // Set up form with react-hook-form and zodResolver for validation
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.fullName || '',
      email: user?.email || '',
      bio: creator?.bio || '',
      categories: creator?.categories || [],
      companyName: brandProfile?.companyName || '',
      industries: brandProfile?.industries || [],
      websiteUrl: brandProfile?.websiteUrl || '',
    },
    mode: 'onChange',
  });

  // Access toast notifications
  const toast = useToast();

  // Load existing profile data into form when component mounts or data changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.fullName || '',
        email: user.email || '',
        bio: creator?.bio || '',
        categories: creator?.categories || [],
        companyName: brandProfile?.companyName || '',
        industries: brandProfile?.industries || [],
        websiteUrl: brandProfile?.websiteUrl || '',
      });
    }
  }, [user, creator, brandProfile, form]);

  // Handle profile image uploads with FileUpload component
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      if (userType === UserType.CREATOR) {
        await uploadProfileImage(file);
        toast.success('Profile image uploaded successfully');
      } else if (userType === UserType.BRAND) {
        // TODO: Implement brand logo upload
        toast.error('Brand logo upload not yet implemented');
      }
    } catch (error: any) {
      toast.error('Failed to upload image', error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Create onSubmit handler to process form submission
  const onSubmit = async (values: ProfileFormValues) => {
    try {
      // Process creator-specific form data if user is a creator (format categories)
      if (userType === UserType.CREATOR) {
        const { bio, categories, name, email } = values;
        await updateProfile({ bio, displayName: name, contactEmail: email });
        if (categories) {
          await updateCategories(categories as Category[]);
        }
      }

      // Process brand-specific form data if user is a brand (format industries, validate URL)
      else if (userType === UserType.BRAND) {
        const { companyName, industries, websiteUrl, name, email } = values;
        await updateBrand({ companyName, websiteUrl, description: name, contactEmail: email });
      }

      // Show loading state during form submission
      form.setValue('name', values.name);
      form.setValue('email', values.email);
      form.setValue('bio', values.bio || '');
      form.setValue('companyName', values.companyName || '');
      form.setValue('websiteUrl', values.websiteUrl || '');
    } catch (error: any) {
      // Display error toast messages after submission
      toast.error('Failed to update profile', error.message);
    }
  };

  // Render a form with appropriate fields for the user type
  return (
    <div className={cn("w-full", className)}>
      <Form {...{ form, onSubmit }}>
        <div className="flex items-center space-x-4">
          <Avatar name={user?.fullName || ''} alt={user?.fullName || ''} src={user?.avatar || ''} />
          <FileUpload
            accept="image/*"
            disabled={uploading}
            onChange={handleImageUpload}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          label="Name"
          required
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          label="Email"
          required
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {userType === UserType.CREATOR && (
          <>
            <FormField
              control={form.control}
              name="bio"
              label="Bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Input placeholder="Short bio (max 160 characters)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {userType === UserType.BRAND && (
          <>
            <FormField
              control={form.control}
              name="companyName"
              label="Company Name"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="websiteUrl"
              label="Website URL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourwebsite.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting || creatorLoading || brandLoading}>
          {form.formState.isSubmitting ? 'Submitting...' : 'Update Profile'}
        </Button>
      </Form>
    </div>
  );
};

export default ProfileManager;