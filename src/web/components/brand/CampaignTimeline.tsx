import React from 'react'; // version: ^18.0.0
import {
  Calendar,
  CheckCircle,
  Circle,
  AlertCircle,
} from 'lucide-react'; // version: ^0.279.0
import { format } from 'date-fns'; // version: ^2.30.0

import { useCampaigns } from '../../hooks/useCampaigns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../lib/utils';
import { CampaignMilestone, CampaignTimelineEvent } from '../../types/campaign';

/**
 * Interface for the CampaignTimeline component props
 */
interface CampaignTimelineProps {
  campaignId: string;
  className?: string;
}

/**
 * Interface for the TimelineEvent component props
 */
interface TimelineEventProps {
  event: TimelineItem;
  isLast: boolean;
}

/**
 * Union type for timeline items (milestones or events)
 */
type TimelineItem = CampaignMilestone | CampaignTimelineEvent;

/**
 * Component that displays a vertical timeline of campaign milestones and events
 * @param {campaignId, className} - The ID of the campaign to display timeline for, and an optional CSS class name for custom styling
 * @returns {JSX.Element} - Rendered timeline component
 */
const CampaignTimeline: React.FC<CampaignTimelineProps> = ({ campaignId, className }) => {
  // LD1: Extract campaignId and optional className from props
  // LD1: Use useCampaigns hook to fetch campaign details
  const { campaignDetail, campaignDetailLoading } = useCampaigns();

  // LD1: Extract milestones from campaign data
  const milestones = campaignDetail?.campaign.milestones || [];

  // LD1: Process milestones and events into chronological order
  const events: TimelineItem[] = React.useMemo(() => {
    return [...milestones].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [milestones]);

  // LD1: Display loading state if data is still loading
  if (campaignDetailLoading) {
    return <div>Loading timeline...</div>;
  }

  // LD1: Render Card component with timeline title and icon
  return (
    <Card className={cn('col-span-2', className)}>
      <CardHeader>
        <CardTitle>
          <Calendar className="mr-2 h-4 w-4" />
          Campaign Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {events.length > 0 ? (
          <div className="relative">
            <div className="absolute left-5 top-0 h-full w-0.5 bg-border" />
            {events.map((event, index) => (
              // LD1: For each event, show date, title, description and status indicator
              <TimelineEvent key={event.id} event={event} isLast={index === events.length - 1} />
            ))}
          </div>
        ) : (
          // LD1: Handle empty state with appropriate message
          <div className="text-sm text-muted-foreground">No timeline events found for this campaign.</div>
        )}
      </CardContent>
    </Card>
  );
};

interface TimelineEventProps {
  event: TimelineItem;
  isLast: boolean;
}

/**
 * Individual timeline event display component
 * @param {event, isLast} - Timeline event object and isLast boolean prop
 * @returns {JSX.Element} - Rendered timeline event
 */
const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast }) => {
  // LD1: Determine appropriate icon based on event type and status
  const icon = getEventIcon({ event });

  // LD1: Format date string from event date
  const formattedDate = format(event.date, 'MMM dd, yyyy');

  return (
    <div className="relative mb-6 last:mb-0">
      {/* LD1: Render event with connector line to next event (unless isLast) */}
      {!isLast && (
        <div className="absolute left-5 top-7 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
      )}
      <div className="relative flex items-center space-x-3">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
        </div>
        <div className="flex-1 space-y-0.5">
          {/* LD1: Display event title, description, date and status badge */}
          <div className="flex justify-between">
            <p className="text-sm font-medium leading-none">{event.title}</p>
            {getEventStatusBadge({ event })}
          </div>
          <p className="text-sm text-muted-foreground">{event.description}</p>
          <time dateTime={event.date.toISOString()} className="ml-auto text-sm text-muted-foreground">
            {formattedDate}
          </time>
        </div>
      </div>
    </div>
  );
};

interface GetEventStatusBadgeProps {
  event: TimelineItem;
}

/**
 * Helper function to determine the appropriate badge for an event's status
 * @param {event} - The timeline event object
 * @returns {JSX.Element} - Badge component with appropriate variant
 */
const getEventStatusBadge: React.FC<GetEventStatusBadgeProps> = ({ event }) => {
  // LD1: Check if the event is a milestone or a timeline event
  if ('completed' in event) {
    // LD1: For milestones, check the completed status
    if (event.completed) {
      // LD1: Return success badge if completed
      return <Badge variant="success">Completed</Badge>;
    } else {
      // LD1: Return primary badge if not completed but in the future
      const isFuture = event.date > new Date();
      if (isFuture) {
        return <Badge>Upcoming</Badge>;
      } else {
        // LD1: Return warning badge if not completed and date has passed
        return <Badge variant="warning">Overdue</Badge>;
      }
    }
  } else {
    // LD1: For timeline events, determine badge based on eventType
    // LD1: Return appropriate badge with text label
    return <Badge>{event.eventType}</Badge>;
  }
};

interface GetEventIconProps {
  event: TimelineItem;
}

/**
 * Helper function to determine the appropriate icon for a timeline event
 * @param {event} - The timeline event object
 * @returns {JSX.Element} - Icon component
 */
const getEventIcon: React.FC<GetEventIconProps> = ({ event }) => {
  // LD1: Check if the event is a milestone or a timeline event
  if ('completed' in event) {
    // LD1: For milestones, return CheckCircle if completed, Circle if upcoming, or AlertCircle if overdue
    if (event.completed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      const isFuture = event.date > new Date();
      if (isFuture) {
        return <Circle className="h-5 w-5 text-primary" />;
      } else {
        return <AlertCircle className="h-5 w-5 text-warning" />;
      }
    }
  } else {
    // LD1: For timeline events, select appropriate icon based on eventType
    // LD1: Return icon with appropriate color and size
    return <Calendar className="h-5 w-5 text-primary" />;
  }
};

// LD2: Export the CampaignTimeline component as the default export
export default CampaignTimeline;