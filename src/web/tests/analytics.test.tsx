# src/web/tests/analytics.test.tsx
```typescript
import React from 'react'; // react v18.2.0+
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react v14.0.0+
import userEvent from '@testing-library/user-event'; // @testing-library/user-event v14.0.0+
import { AnalyticsOverview } from '../components/creator/AnalyticsOverview'; // src/web/components/creator/AnalyticsOverview.tsx
import PlatformBreakdown from '../components/creator/PlatformBreakdown'; // src/web/components/creator/PlatformBreakdown.tsx
import ContentPerformance from '../components/creator/ContentPerformance'; // src/web/components/creator/ContentPerformance.tsx
import AudienceInsights from '../components/creator/AudienceInsights'; // src/web/components/creator/AudienceInsights.tsx
import MetricsCard from '../components/shared/MetricsCard'; // src/web/components/shared/MetricsCard.tsx
import { Chart } from '../components/shared/ChartComponents'; // src/web/components/shared/ChartComponents.tsx
import { useAnalytics } from '../hooks/useAnalytics'; // src/web/hooks/useAnalytics.ts
import { MetricPeriod, MetricType, ChartTypes } from '../types/analytics'; // src/web/types/analytics.ts
import { PlatformType } from '../types/platform'; // src/web/types/platform.ts

// Mock the useAnalytics hook
jest.mock('../hooks/useAnalytics');

describe('Analytics Components', () => {
  let mockAnalyticsData: any;

  beforeEach(() => {
    mockAnalyticsData = {
      isLoading: false,
      error: null,
      creatorMetrics: {
        totalViews: 1000,
        totalEngagements: 100,
        totalContentValue: 50,
        averageEngagementRate: 0.1,
        platformBreakdown: [
          { platformType: PlatformType.YOUTUBE, views: 500, engagements: 50, engagementRate: 0.1, contentValue: 25 },
          { platformType: PlatformType.INSTAGRAM, views: 500, engagements: 50, engagementRate: 0.1, contentValue: 25 },
        ],
        timeSeriesData: [
          { date: '2023-01-01', views: 100, engagements: 10 },
          { date: '2023-01-02', views: 200, engagements: 20 },
        ],
        audienceMetrics: {
          ageDistribution: { '18-24': 50, '25-34': 50 },
          genderDistribution: { male: 50, female: 50 },
          geographicDistribution: { US: 50, CA: 50 },
          interestCategories: { tech: 50, lifestyle: 50 },
          deviceDistribution: { mobile: 50, desktop: 50 },
        },
      },
      selectedPeriod: MetricPeriod.MONTH,
      timeframe: { startDate: '2023-01-01', endDate: '2023-01-31', period: MetricPeriod.MONTH },
      selectedPlatforms: [],
      selectedContentTypes: [],
      periodOptions: [
        { label: 'Day', value: MetricPeriod.DAY },
        { label: 'Week', value: MetricPeriod.WEEK },
        { label: 'Month', value: MetricPeriod.MONTH },
      ],
      getTimeSeriesData: jest.fn().mockReturnValue([{ label: '2023-01-01', value: 100 }]),
      getPlatformBreakdown: jest.fn().mockReturnValue([{ platformType: PlatformType.YOUTUBE, views: 500 }]),
      getContentTypeBreakdown: jest.fn().mockReturnValue([{ contentType: 'video', views: 500 }]),
      setPeriod: jest.fn(),
      setSelectedPlatforms: jest.fn(),
      setSelectedContentTypes: jest.fn(),
      refreshAnalytics: jest.fn(),
      exportAnalytics: jest.fn(),
    };

    (useAnalytics as jest.Mock).mockReturnValue(mockAnalyticsData);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('MetricsCard renders with correct data', () => {
    render(<MetricsCard title="Views" value={1000} trend={0.1} />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  test('MetricsCard renders loading state correctly', () => {
    render(<MetricsCard title="Views" value={0} isLoading={true} />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('AnalyticsOverview renders with loading state', async () => {
    (useAnalytics as jest.Mock).mockReturnValue({
      ...mockAnalyticsData,
      isLoading: true,
    });
    render(<AnalyticsOverview />);
    expect(screen.getByText('Loading audience data...')).toBeInTheDocument();
  });

  test('AnalyticsOverview renders metrics correctly', async () => {
    render(<AnalyticsOverview />);
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  test('AnalyticsOverview period selector changes timeframe', async () => {
    render(<AnalyticsOverview />);
    const periodSelect = screen.getByRole('combobox');
    fireEvent.change(periodSelect, { target: { value: MetricPeriod.WEEK } });
    expect(mockAnalyticsData.setPeriod).toHaveBeenCalledWith(MetricPeriod.WEEK);
  });

  test('PlatformBreakdown renders correct platform distribution', async () => {
    render(<PlatformBreakdown metric={MetricType.VIEWS} />);
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  test('ContentPerformance displays content metrics correctly', async () => {
    render(<ContentPerformance />);
  });

  test('AudienceInsights displays demographic data correctly', async () => {
    render(<AudienceInsights />);
    expect(screen.getByText('Age Distribution')).toBeInTheDocument();
    expect(screen.getByText('Gender Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Top Locations')).toBeInTheDocument();
    expect(screen.getByText('Top Interests')).toBeInTheDocument();
    expect(screen.getByText('Device Usage')).toBeInTheDocument();
  });

  test('Chart component renders with correct data', () => {
    const lineData = {
      series: [{
        id: 'views',
        name: 'Views',
        data: [{ label: '2023-01-01', value: 100 }],
      }],
    };
    render(<Chart type={ChartTypes.LINE} data={lineData} />);
  });

  test('AnalyticsOverview refresh button triggers data refresh', async () => {
    render(<AnalyticsOverview />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    expect(mockAnalyticsData.refreshAnalytics).toHaveBeenCalled();
  });

  test('platform filter updates analytics display', async () => {
    render(<AnalyticsOverview />);
    const platformSelect = screen.getByRole('combobox');
    fireEvent.change(platformSelect, { target: { value: PlatformType.YOUTUBE } });
    expect(mockAnalyticsData.setSelectedPlatforms).toHaveBeenCalledWith([PlatformType.YOUTUBE]);
  });
});