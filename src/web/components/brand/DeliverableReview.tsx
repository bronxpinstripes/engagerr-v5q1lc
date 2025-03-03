import React, { useState, useEffect } from 'react'; // react v18.0.0
import { Check, X, AlertTriangle, MessageSquare } from 'lucide-react'; // lucide-react v0.279.0

import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { Card, CardContent } from '../ui/Card';
import Input from '../ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import Badge from '../ui/Badge';
import ContentFamilyVisualization from '../shared/ContentFamilyVisualization';

import { usePartnerships } from '../../hooks/usePartnerships';
import useToast from '../../hooks/useToast';
import { formatDate } from '../../lib/formatters';
import {
  Deliverable,
  DeliverableStatus,
  DeliverableFeedback,
} from '../../types/partnership';

/**
 * @interface DeliverableReviewProps
 * @description Props for the DeliverableReview component.
 */
interface DeliverableReviewProps {
  deliverable: Deliverable;
  partnershipId: string;
  onReviewComplete: (updatedDeliverable: Deliverable) => void;
  showHeader?: boolean;
  className?: string;
}

/**
 * @interface FeedbackFormState
 * @description State for the feedback form.
 */
interface FeedbackFormState {
  status: 'approve' | 'request_revision' | 'reject';
  feedback: string;
}

/**
 * @component DeliverableReview
 * @description A component for brands to review deliverable submissions from creators.
 */
const DeliverableReview: React.FC<DeliverableReviewProps> = ({
  deliverable,
  partnershipId,
  onReviewComplete,
  showHeader = true,
  className = '',
}) => {
  // Initialize state for feedback form
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormState>({
    status: 'approve',
    feedback: '',
  });

  // Access partnership functions and toast notifications
  const { provideDeliverableFeedback } = usePartnerships();
  const toast = useToast();

  // Function to handle feedback submission
  const handleSubmitFeedback = async () => {
    try {
      // Call the provideDeliverableFeedback function from the usePartnerships hook
      const updatedDeliverable = await provideDeliverableFeedback({
        deliverableId: deliverable.id,
        status: feedbackForm.status,
        feedback: feedbackForm.feedback,
      });

      // Call the onReviewComplete callback function
      onReviewComplete(updatedDeliverable);

      // Display success message
      toast.success('Deliverable feedback submitted successfully!');
    } catch (error: any) {
      // Display error message
      toast.error(
        'Failed to submit deliverable feedback',
        error?.message || 'Please try again later.'
      );
    }
  };

  // Check if the deliverable is in a reviewable state
  const isReviewable = deliverable.status === DeliverableStatus.SUBMITTED;

  return (
    <Card className={className}>
      {showHeader && (
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">Deliverable Review</h3>
        </div>
      )}
      <CardContent className="flex flex-col gap-4">
        {/* Deliverable Details */}
        <div className="flex items-center justify-between">
          <h4 className="text-md font-semibold">
            {deliverable.description}
          </h4>
          <Badge variant="secondary">{deliverable.contentType}</Badge>
        </div>

        {/* Content Preview (Placeholder) */}
        {deliverable.contentUrl ? (
          <a href={deliverable.contentUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={deliverable.contentUrl}
              alt={deliverable.description}
              className="rounded-md"
            />
          </a>
        ) : (
          <Alert variant="warning">
            <AlertTitle>No Content Available</AlertTitle>
            <AlertDescription>
              The creator has not yet submitted content for this deliverable.
            </AlertDescription>
          </Alert>
        )}

        {/* Metadata */}
        <div className="text-sm text-gray-500">
          <p>
            Due Date: {formatDate(deliverable.dueDate)}
          </p>
          <p>
            Submitted On: {formatDate(deliverable.submittedAt)}
          </p>
        </div>

        {/* Requirements */}
        <div>
          <h5 className="text-sm font-semibold">Requirements:</h5>
          <p className="text-sm">{deliverable.requirements}</p>
        </div>

        {/* Feedback Form */}
        {isReviewable ? (
          <div className="flex flex-col gap-2">
            <h5 className="text-sm font-semibold">Your Feedback:</h5>
            <Input
              type="text"
              placeholder="Enter your feedback here..."
              value={feedbackForm.feedback}
              onChange={(e) =>
                setFeedbackForm({ ...feedbackForm, feedback: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFeedbackForm({ ...feedbackForm, status: 'request_revision' })}
              >
                Request Revision
              </Button>
              <Button
                variant="destructive"
                onClick={() => setFeedbackForm({ ...feedbackForm, status: 'reject' })}
              >
                Reject
              </Button>
              <Button
                onClick={() => setFeedbackForm({ ...feedbackForm, status: 'approve' })}
              >
                Approve
              </Button>
            </div>
          </div>
        ) : (
          <Alert variant="info">
            <AlertTitle>Deliverable Status</AlertTitle>
            <AlertDescription>
              This deliverable is currently {deliverable.status}.
            </AlertDescription>
          </Alert>
        )}

        {/* Previous Feedback History (Placeholder) */}
        {deliverable.feedbackNotes && (
          <div>
            <h5 className="text-sm font-semibold">Previous Feedback:</h5>
            <p className="text-sm">{deliverable.feedbackNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliverableReview;