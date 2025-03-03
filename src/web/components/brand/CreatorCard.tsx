import React, { useState } from 'react';
import { Star, StarOff, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import { formatFollowerCount, formatEngagementRate } from '../../lib/formatters';

/**
 * Props for the CreatorCard component
 */
interface CreatorCardProps {
  /** Creator data including profile information and metrics */
  creator: Creator & { 
    metrics?: CreatorMetrics, 
    matchScore?: number 
  };
  /** Whether the creator is favorited by the current brand */
  isFavorite: boolean;
  /** Function to handle favoriting/unfavoriting the creator */
  onFavorite: (creatorId: string, isFavorite: boolean) => void;
  /** Function to handle viewing the creator's full profile */
  onView: (creatorId: string) => void;
  /** Function to handle adding creator to a list */
  onAddToList: (creatorId: string) => void;
  /** Additional CSS classes to apply to the card */
  className?: string;
  /** Whether to display the AI match score */
  showMatchScore?: boolean;
}

/**
 * Component that displays a creator's profile information in card format for discovery
 */
const CreatorCard: React.FC<CreatorCardProps> = ({
  creator,
  isFavorite,
  onFavorite,
  onView,
  onAddToList,
  className,
  showMatchScore = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Extract profile data
  const profileImage = creator.profileImage || '';
  const displayName = creator.displayName || creator.name || 'Unnamed Creator';
  const categories = creator.categories || [];
  
  // Extract metrics data
  const totalFollowers = creator.metrics?.totalFollowers || 0;
  const averageEngagementRate = creator.metrics?.averageEngagementRate || 0;
  
  // Determine active platforms
  const platformMetrics = creator.metrics?.platformMetrics || {};
  const platforms = {
    youtube: !!platformMetrics.youtube,
    instagram: !!platformMetrics.instagram,
    tiktok: !!platformMetrics.tiktok,
    twitter: !!platformMetrics.twitter,
    linkedin: !!platformMetrics.linkedin,
  };
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(creator.id, !isFavorite);
  };
  
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(creator.id);
  };
  
  const handleAddToListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToList(creator.id);
  };
  
  const handleCardClick = () => {
    onView(creator.id);
  };
  
  return (
    <Card 
      className={cn(
        "w-full hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden",
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Avatar 
            src={profileImage}
            alt={displayName}
            name={displayName}
            size="md"
          />
          <div>
            <h3 className="font-medium">{displayName}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {categories && categories.map((category, i) => (
                <Badge key={i} variant="outline" size="sm">{category}</Badge>
              ))}
            </div>
          </div>
        </div>
        {showMatchScore && creator.matchScore && (
          <MatchScoreBadge score={creator.matchScore} />
        )}
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Followers</p>
            <p className="text-lg font-medium">{formatFollowerCount(totalFollowers)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Engagement</p>
            <p className="text-lg font-medium">{formatEngagementRate(averageEngagementRate)}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <PlatformIcons platforms={platforms} />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
          ) : (
            <StarOff className="h-4 w-4 mr-1" />
          )}
          {isFavorite ? "Favorited" : "Favorite"}
        </Button>
        
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewClick}
            aria-label="View profile"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddToListClick}
            aria-label="Add to list"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

/**
 * Component that displays the AI match score between creator and brand
 */
const MatchScoreBadge = ({ score }: { score: number }) => {
  let variant = "outline";
  
  if (score >= 90) {
    variant = "success";
  } else if (score >= 75) {
    variant = "primary";
  } else if (score >= 60) {
    variant = "secondary";
  }
  
  return (
    <Badge variant={variant as any} size="sm">
      {score}% Match
    </Badge>
  );
};

/**
 * Component that displays icons for platforms the creator is active on
 */
const PlatformIcons = ({ platforms }: { platforms: Record<string, boolean> }) => {
  const activePlatforms = Object.entries(platforms)
    .filter(([_, isActive]) => isActive)
    .map(([platform]) => platform);
  
  if (activePlatforms.length === 0) {
    return null;
  }
  
  return (
    <div className="flex space-x-2">
      {activePlatforms.includes('youtube') && (
        <span className="text-red-600" title="YouTube">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        </span>
      )}
      {activePlatforms.includes('instagram') && (
        <span className="text-pink-600" title="Instagram">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </span>
      )}
      {activePlatforms.includes('tiktok') && (
        <span className="text-black" title="TikTok">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
          </svg>
        </span>
      )}
      {activePlatforms.includes('twitter') && (
        <span className="text-blue-400" title="Twitter">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
          </svg>
        </span>
      )}
      {activePlatforms.includes('linkedin') && (
        <span className="text-blue-700" title="LinkedIn">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </span>
      )}
    </div>
  );
};

export default CreatorCard;