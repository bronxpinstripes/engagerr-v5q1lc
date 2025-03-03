import React, { useState } from 'react'; // react v18.0+
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // v13.1.1
import { useForm, SubmitHandler } from 'react-hook-form'; // v7.45.0
import { zodResolver } from '@hookform/resolvers/zod'; // v3.1.0
import { z } from 'zod'; // v3.21.4

import { useMediaKit } from '../../hooks/useMediaKit';
import { MediaKitElementType, MediaKitElement } from '../../types/media-kit';
import { Card, CardContent } from '../ui/Card';
import Checkbox from '../ui/Checkbox';
import { Form } from '../forms/Form';
import { FormField } from '../forms/FormField';

/**
 * @description Array of default media kit elements with their types, titles, and descriptions
 */
const DEFAULT_ELEMENTS = [
  { type: MediaKitElementType.PROFILE_SUMMARY, title: 'Profile Summary', description: 'Concise overview of your brand and expertise' },
  { type: MediaKitElementType.PLATFORM_STATS, title: 'Platform Stats', description: 'Key metrics from your connected platforms' },
  { type: MediaKitElementType.AUDIENCE_DEMOGRAPHICS, title: 'Audience Demographics', description: 'Insights into your audience demographics' },
  { type: MediaKitElementType.CONTENT_SHOWCASE, title: 'Content Showcase', description: 'Examples of your best-performing content' },
  { type: MediaKitElementType.CASE_STUDIES, title: 'Case Studies', description: 'Success stories from past brand partnerships' },
  { type: MediaKitElementType.RATE_CARD, title: 'Rate Card', description: 'Pricing for different types of content and services' },
  { type: MediaKitElementType.TESTIMONIALS, title: 'Testimonials', description: 'Quotes from satisfied clients and partners' },
];

/**
 * @description Returns the appropriate icon component for each element type
 * @param MediaKitElementType type
 * @returns JSX.Element Icon component for the specified element type
 */
const getElementIcon = (type: MediaKitElementType): JSX.Element => {
  switch (type) {
    case MediaKitElementType.PROFILE_SUMMARY:
      return <span aria-hidden={true}>📝</span>;
    case MediaKitElementType.PLATFORM_STATS:
      return <span aria-hidden={true}>📊</span>;
    case MediaKitElementType.AUDIENCE_DEMOGRAPHICS:
      return <span aria-hidden={true}>👥</span>;
    case MediaKitElementType.CONTENT_SHOWCASE:
      return <span aria-hidden={true}>🎬</span>;
    case MediaKitElementType.CASE_STUDIES:
      return <span aria-hidden={true}>💼</span>;
    case MediaKitElementType.RATE_CARD:
      return <span aria-hidden={true}>💰</span>;
    case MediaKitElementType.TESTIMONIALS:
      return <span aria-hidden={true}>💬</span>;
    default:
      return <span aria-hidden={true}>ℹ️</span>;
  }
};

interface MediaKitElementsProps {
  selectedElements: MediaKitElement[];
  onElementsChange: (elements: MediaKitElement[]) => void;
  className?: string;
}

const elementSchema = z.object({
  elements: z.array(z.string()).optional(),
});

type ElementSchemaType = z.infer<typeof elementSchema>;

/**
 * @description Component that provides a UI for selecting, arranging, and configuring media kit elements
 * @param React.FC MediaKitElementsProps
 */
export const MediaKitElements: React.FC<MediaKitElementsProps> = ({ selectedElements, onElementsChange, className }) => {
  const { handleSubmit } = useMediaKit();

  const form = useForm<ElementSchemaType>({
    resolver: zodResolver(elementSchema),
    defaultValues: {
      elements: selectedElements?.map((element) => element.type) || [],
    },
  });

  /**
   * @description Toggles the selection of a media kit element
   * @param string elementType
   * @returns void No return value
   */
  const handleElementToggle = (elementType: string): void => {
    const isSelected = selectedElements.some((element) => element.type === elementType);

    let updatedElements: MediaKitElement[];
    if (isSelected) {
      updatedElements = selectedElements.filter((element) => element.type !== elementType);
    } else {
      const elementToAdd = DEFAULT_ELEMENTS.find((element) => element.type === elementType);
      if (elementToAdd) {
        updatedElements = [...selectedElements, elementToAdd];
      } else {
        updatedElements = [...selectedElements];
      }
    }

    onElementsChange(updatedElements);
  };

  /**
   * @description Updates the order of elements after drag and drop operation
   * @param object result
   * @returns void No return value
   */
  const handleDragEnd = (result: any): void => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(selectedElements);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onElementsChange(items);
  };

  /**
   * @description Renders an individual media kit element option
   * @param MediaKitElement element
   * @param number index
   * @returns JSX.Element Rendered element item
   */
  const renderElementItem = (element: MediaKitElement, index: number): JSX.Element => (
    <Draggable key={element.type} draggableId={element.type} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card className="mb-4">
            <CardContent>
              <div className="flex items-center space-x-4">
                {getElementIcon(element.type)}
                <FormField
                  control={form.control}
                  name="elements"
                  render={() => (
                    <Checkbox
                      id={element.type}
                      label={element.title}
                      description={element.description}
                      checked={selectedElements.some((selected) => selected.type === element.type)}
                      onCheckedChange={() => handleElementToggle(element.type)}
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );

  return (
    <Form form={form} onSubmit={() => {}}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="elements">
          {(provided) => (
            <div
              className={className}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {selectedElements.map((element, index) => renderElementItem(element, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Form>
  );
};