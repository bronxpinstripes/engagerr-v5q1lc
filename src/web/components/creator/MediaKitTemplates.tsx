import React from 'react'; // React library for building user interfaces
import { CheckCircle } from 'lucide-react'; // Icon for selected template indication // v0.279.0
import { cn } from '../../lib/utils'; // Utility for conditionally joining class names
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../ui/Card'; // Card components for template display
import { Button } from '../ui/Button'; // Button component for template selection
import { useMediaKit } from '../../hooks/useMediaKit'; // Hook for media kit operations
import { MediaKitTemplateId } from '../../types/media-kit'; // Enum for media kit template identifiers

/**
 * Interface for the props of the MediaKitTemplates component.
 * @param selectedTemplate - The ID of the currently selected media kit template.
 * @param onSelectTemplate - A function to call when a template is selected.
 * @param className - Optional CSS class name to apply to the component.
 */
export interface MediaKitTemplatesProps {
  selectedTemplate: MediaKitTemplateId;
  onSelectTemplate: (templateId: MediaKitTemplateId) => void;
  className?: string;
}

/**
 * Helper interface to define the structure of template details.
 * @param name - The name of the template.
 * @param description - A brief description of the template.
 * @param previewImage - The URL of the template's preview image.
 */
interface TemplateDetails {
  name: string;
  description: string;
  previewImage: string;
}

/**
 * Component for displaying and selecting media kit templates
 * @param props - MediaKitTemplatesProps containing selectedTemplate, onSelectTemplate, and className
 * @returns Rendered media kit templates component
 */
const MediaKitTemplates: React.FC<MediaKitTemplatesProps> = ({
  selectedTemplate,
  onSelectTemplate,
  className,
}) => {
  /**
   * Defines the available media kit template options.
   * Each template has an ID, name, description, and preview image.
   */
  const templateOptions = [
    {
      id: MediaKitTemplateId.MINIMAL,
      name: 'Minimal',
      description: 'Clean and simple design for a professional look.',
      previewImage: '/images/media-kit-templates/minimal.png',
    },
    {
      id: MediaKitTemplateId.PROFESSIONAL,
      name: 'Professional',
      description: 'Classic and structured layout for detailed information.',
      previewImage: '/images/media-kit-templates/professional.png',
    },
    {
      id: MediaKitTemplateId.CREATIVE,
      name: 'Creative',
      description: 'Modern and artistic design to showcase your unique style.',
      previewImage: '/images/media-kit-templates/creative.png',
    },
    {
      id: MediaKitTemplateId.ENTERPRISE,
      name: 'Enterprise',
      description: 'Comprehensive and data-driven layout for business insights.',
      previewImage: '/images/media-kit-templates/enterprise.png',
    },
  ];

  /**
   * Helper function to get template metadata by template ID
   * @param templateId - MediaKitTemplateId to retrieve details for
   * @returns Template metadata including name, description, and preview image
   */
  const getTemplateDetails = (templateId: MediaKitTemplateId): TemplateDetails => {
    const template = templateOptions.find((option) => option.id === templateId);
    return template || {
      name: 'Default',
      description: 'A default template.',
      previewImage: '/images/media-kit-templates/professional.png',
    };
  };

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', className)}>
      {templateOptions.map((template) => {
        const isSelected = template.id === selectedTemplate;
        const templateDetails = getTemplateDetails(template.id);

        return (
          <Card
            key={template.id}
            className={cn(
              'cursor-pointer transition-shadow hover:shadow-lg',
              isSelected ? 'border-2 border-primary' : 'border-muted',
            )}
            onClick={() => onSelectTemplate(template.id)}
          >
            <CardHeader>
              <CardTitle>{templateDetails.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={templateDetails.previewImage}
                alt={`${templateDetails.name} Template Preview`}
                className="aspect-video w-full rounded-md object-cover"
              />
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{templateDetails.description}</p>
              {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export { MediaKitTemplates };