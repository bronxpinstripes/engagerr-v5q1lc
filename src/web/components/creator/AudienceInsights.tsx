import React, { useState, useMemo, useCallback } from 'react'; // React v18.2.0
import { Users, MapPin, Smartphone, Laptop, Heart, RefreshCw } from 'lucide-react'; // lucide-react v0.279.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Chart, PieChartComponent, VennDiagramComponent } from '../shared/ChartComponents';
import { cn } from '../../lib/utils';
import useAnalytics from '../../hooks/useAnalytics';
import { AudienceMetrics, ChartTypes, PlatformType } from '../../types/analytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

/**
 * @interface AudienceInsightsProps
 * @description Props for the AudienceInsights component.
 */
interface AudienceInsightsProps {
  className?: string;
  contentId?: string;
  compact?: boolean;
  showRefreshButton?: boolean;
}

/**
 * @interface DemographicChartData
 * @description Data structure for demographic chart visualization.
 */
interface DemographicChartData {
  data: any[];
  colors: string[];
  labels: string[];
  title: string;
  options: any;
}

/**
 * @function AudienceInsights
 * @param {AudienceInsightsProps} props - Props for the AudienceInsights component.
 * @returns {JSX.Element} - Rendered audience insights component with demographic visualizations.
 * @description Main component that displays comprehensive audience demographics and insights.
 */
const AudienceInsights: React.FC<AudienceInsightsProps> = ({
  className,
  contentId,
  compact = false,
  showRefreshButton = true,
}) => {
  // LD1: Destructure className, contentId, and other props from component props
  // LD1: Use useAnalytics hook to retrieve audience metrics and analytics state
  const {
    creatorMetrics,
    selectedPlatform,
    setSelectedPlatforms,
    refreshAnalytics,
    isLoading,
  } = useAnalytics({ contentId });

  // LD1: Create state for active tab selection using useState
  const [activeTab, setActiveTab] = useState('demographics');

  // LD1: Format audience data for different chart visualizations using useMemo
  const demographicChartData = useMemo(() => {
    if (!creatorMetrics?.audienceMetrics) return null;

    const formatDemographicChartData = (audienceMetrics: AudienceMetrics, demographicType: string): DemographicChartData | null => {
      switch (demographicType) {
        case 'age':
          return {
            data: Object.entries(audienceMetrics.ageDistribution).map(([label, value]) => ({
              label,
              value,
            })),
            colors: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
            labels: Object.keys(audienceMetrics.ageDistribution),
            title: 'Age Distribution',
            options: {},
          };
        case 'gender':
          return {
            data: Object.entries(audienceMetrics.genderDistribution).map(([label, value]) => ({
              label,
              value,
            })),
            colors: ['#EC4899', '#F472B6', '#F9A8D4'],
            labels: Object.keys(audienceMetrics.genderDistribution),
            title: 'Gender Breakdown',
            options: {
              innerRadius: 50,
            },
          };
        case 'geography':
          return {
            data: Object.entries(audienceMetrics.geographicDistribution).sort(([, a], [, b]) => b - a).slice(0, 10).map(([label, value]) => ({
              label,
              value,
            })),
            colors: ['#0D9488', '#14B8A6', '#2DD4BF'],
            labels: Object.keys(audienceMetrics.geographicDistribution),
            title: 'Top Locations',
            options: {},
          };
        case 'interests':
          return {
            data: Object.entries(audienceMetrics.interestCategories).sort(([, a], [, b]) => b - a).slice(0, 10).map(([label, value]) => ({
              label,
              value,
            })),
            colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
            labels: Object.keys(audienceMetrics.interestCategories),
            title: 'Top Interests',
            options: {},
          };
        case 'devices':
          return {
            data: Object.entries(audienceMetrics.deviceDistribution).map(([label, value]) => ({
              label,
              value,
            })),
            colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
            labels: Object.keys(audienceMetrics.deviceDistribution),
            title: 'Device Usage',
            options: {
              innerRadius: 50,
            },
          };
        default:
          return null;
      }
    };

    return {
      age: formatDemographicChartData(creatorMetrics.audienceMetrics, 'age'),
      gender: formatDemographicChartData(creatorMetrics.audienceMetrics, 'gender'),
      geography: formatDemographicChartData(creatorMetrics.audienceMetrics, 'geography'),
      interests: formatDemographicChartData(creatorMetrics.audienceMetrics, 'interests'),
      devices: formatDemographicChartData(creatorMetrics.audienceMetrics, 'devices'),
    };
  }, [creatorMetrics]);

  // LD1: Handle loading state with skeleton UI patterns
  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle>Audience Insights</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p>Loading audience data...</p>
        </CardContent>
      </Card>
    );
  }

  // LD1: Implement refresh functionality to update audience data
  const handleRefresh = async () => {
    // LD1: Set isRefreshing state to true
    // LD1: Call refreshAnalytics function from useAnalytics hook
    // LD1: Set isRefreshing state to false when complete
    await refreshAnalytics();
  };

  // LD1: Implement platform filtering to view audience by specific platform
  const handlePlatformChange = (platform: PlatformType | 'all') => {
    // LD1: Set selectedPlatform state to the selected value
    setSelectedPlatforms(platform === 'all' ? [] : [platform]);
  };

  // LD1: Display total audience size and growth metrics
  const totalAudience = creatorMetrics?.audienceMetrics?.totalAudience || 0;
  const audienceGrowthRate = creatorMetrics?.audienceMetrics?.audienceGrowthRate || 0;

  // LD1: Handle empty state when no audience data is available
  if (!creatorMetrics?.audienceMetrics) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <CardTitle>Audience Insights</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p>No audience data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle>Audience Insights</CardTitle>
        <CardDescription>
          {compact ? (
            <>
              Total Audience: {totalAudience}
              {showRefreshButton && (
                <button onClick={handleRefresh} className="ml-2">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <>
              Understand your audience demographics and behavior patterns.
              {showRefreshButton && (
                <button onClick={handleRefresh} className="ml-2">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!compact && (
          <div className="flex items-center justify-between mb-4">
            <div>
              Total Audience: {totalAudience}
              {audienceGrowthRate !== 0 && (
                <span className={`ml-2 text-sm ${audienceGrowthRate > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ({audienceGrowthRate > 0 ? '+' : ''}{audienceGrowthRate.toFixed(1)}%)
                </span>
              )}
            </div>
            <Select onValueChange={(value) => handlePlatformChange(value as PlatformType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <Tabs defaultValue="demographics" className="w-full">
          <TabsList>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="interests">Interests</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>
          <TabsContent value="demographics">
            {demographicChartData?.age && (
              <Chart
                type={ChartTypes.BAR}
                data={{ series: [{ id: 'age', name: 'Age', data: demographicChartData.age.data }] }}
                options={{ title: 'Age Distribution' }}
              />
            )}
            {demographicChartData?.gender && (
              <Chart
                type={ChartTypes.PIE}
                data={{ series: [{ id: 'gender', name: 'Gender', data: demographicChartData.gender.data }] }}
                options={{ title: 'Gender Breakdown', innerRadius: 50 }}
              />
            )}
          </TabsContent>
          <TabsContent value="geography">
            {demographicChartData?.geography && (
              <Chart
                type={ChartTypes.BAR}
                data={{ series: [{ id: 'geography', name: 'Geography', data: demographicChartData.geography.data }] }}
                options={{ title: 'Top Locations' }}
              />
            )}
          </TabsContent>
          <TabsContent value="interests">
            {demographicChartData?.interests && (
              <Chart
                type={ChartTypes.BAR}
                data={{ series: [{ id: 'interests', name: 'Interests', data: demographicChartData.interests.data }] }}
                options={{ title: 'Top Interests' }}
              />
            )}
          </TabsContent>
          <TabsContent value="devices">
            {demographicChartData?.devices && (
              <Chart
                type={ChartTypes.PIE}
                data={{ series: [{ id: 'devices', name: 'Devices', data: demographicChartData.devices.data }] }}
                options={{ title: 'Device Usage', innerRadius: 50 }}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AudienceInsights;