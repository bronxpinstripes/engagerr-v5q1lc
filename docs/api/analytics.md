# Analytics API Reference

The Engagerr Analytics API provides standardized access to performance metrics across multiple platforms, content relationship analytics, and AI-generated insights. This documentation outlines available endpoints, request parameters, response formats, and usage examples.

## Authentication

All Analytics API requests require authentication using a valid JWT token.

```http
Authorization: Bearer <your_jwt_token>
```

## Base URL

All API requests should be prefixed with:

```
https://api.engagerr.io/api
```

## Rate Limiting

Analytics endpoints are subject to rate limiting based on your subscription tier:

| Subscription Tier | Rate Limit      |
|-------------------|-----------------|
| Free              | 60 requests/hour |
| Creator           | 300 requests/hour |
| Creator Pro       | 1000 requests/hour |
| Enterprise        | 5000 requests/hour |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1626307515
```

## Common Parameters

Many analytics endpoints accept these common parameters:

| Parameter | Type    | Description                                                  |
|-----------|---------|--------------------------------------------------------------|
| startDate | string  | Start date for analytics (ISO 8601 format, e.g., 2023-01-01) |
| endDate   | string  | End date for analytics (ISO 8601 format, e.g., 2023-01-31)   |
| timeframe | string  | Predefined timeframe (day, week, month, quarter, year)       |
| platforms | string[] | Filter by specific platforms (e.g., youtube, instagram)      |
| limit     | number  | Number of results to return (default: 25, max: 100)          |
| page      | number  | Page number for pagination (default: 1)                      |

## Cross-Platform Analytics

### Get Unified Analytics

Retrieves standardized metrics across all connected platforms.

```
GET /analytics/unified
```

#### Request Parameters

| Parameter   | Type    | Required | Description                                     |
|-------------|---------|----------|-------------------------------------------------|
| startDate   | string  | No       | Start date (ISO 8601)                           |
| endDate     | string  | No       | End date (ISO 8601)                             |
| timeframe   | string  | No       | Predefined timeframe                            |
| platforms   | string[] | No       | Filter by specific platforms                    |
| metrics     | string[] | No       | Specific metrics to include                     |
| granularity | string  | No       | Data granularity (day, week, month) Default: day |

#### Response Format

```json
{
  "timeframe": {
    "startDate": "2023-01-01",
    "endDate": "2023-01-31"
  },
  "metrics": {
    "summary": {
      "totalViews": 125432,
      "totalEngagements": 23541,
      "totalShares": 4328,
      "totalComments": 2156,
      "engagementRate": 18.76,
      "estimatedValue": 2340.58
    },
    "timeSeries": [
      {
        "date": "2023-01-01",
        "views": 3214,
        "engagements": 612,
        "shares": 105,
        "comments": 67
      },
      // Additional time series data points
    ],
    "platforms": {
      "youtube": {
        "views": 65432,
        "engagements": 10523,
        "shares": 1843,
        "comments": 982
      },
      "instagram": {
        "views": 42185,
        "engagements": 8765,
        "shares": 1624,
        "comments": 843
      },
      "tiktok": {
        "views": 17815,
        "engagements": 4253,
        "shares": 861,
        "comments": 331
      }
    }
  }
}
```

#### Example Request

```http
GET /api/analytics/unified?startDate=2023-01-01&endDate=2023-01-31&platforms=youtube,instagram,tiktok
```

### Get Platform Analytics

Retrieves metrics for a specific connected platform.

```
GET /analytics/platform/:platformId
```

#### Request Parameters

| Parameter   | Type    | Required | Description                                     |
|-------------|---------|----------|-------------------------------------------------|
| platformId  | string  | Yes      | Platform ID (from connected platforms)          |
| startDate   | string  | No       | Start date (ISO 8601)                           |
| endDate     | string  | No       | End date (ISO 8601)                             |
| timeframe   | string  | No       | Predefined timeframe                            |
| metrics     | string[] | No       | Specific metrics to include                     |
| granularity | string  | No       | Data granularity (day, week, month) Default: day |

#### Response Format

```json
{
  "platform": {
    "id": "platform-123",
    "type": "youtube",
    "handle": "@creatorname"
  },
  "timeframe": {
    "startDate": "2023-01-01",
    "endDate": "2023-01-31"
  },
  "metrics": {
    "summary": {
      "views": 65432,
      "engagements": 10523,
      "shares": 1843,
      "comments": 982,
      "watchTime": 548332,
      "subscribers": 3241,
      "engagementRate": 16.08
    },
    "timeSeries": [
      {
        "date": "2023-01-01",
        "views": 1823,
        "engagements": 342,
        "shares": 65,
        "comments": 31
      },
      // Additional time series data points
    ],
    "topContent": [
      {
        "id": "content-123",
        "title": "How to Optimize Your Content Strategy",
        "publishedAt": "2023-01-15T12:30:00Z",
        "views": 12453,
        "engagements": 3214,
        "engagementRate": 25.81
      },
      // Additional top content items
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/platform/platform-123?startDate=2023-01-01&endDate=2023-01-31&metrics=views,engagements,shares,comments
```

## Content Relationship Analytics

### Get Content Family Analytics

Retrieves aggregated metrics for a content family (parent content and all derivatives).

```
GET /analytics/content/:contentId/family
```

#### Request Parameters

| Parameter | Type    | Required | Description                                     |
|-----------|---------|----------|-------------------------------------------------|
| contentId | string  | Yes      | ID of the parent or child content               |
| startDate | string  | No       | Start date (ISO 8601)                           |
| endDate   | string  | No       | End date (ISO 8601)                             |
| metrics   | string[] | No       | Specific metrics to include                     |
| includeGraph | boolean | No    | Include relationship graph in response (default: false) |

#### Response Format

```json
{
  "contentFamily": {
    "rootContent": {
      "id": "content-123",
      "title": "Marketing Strategies Podcast Episode #42",
      "platform": "spotify",
      "contentType": "podcast",
      "publishedAt": "2023-01-10T10:00:00Z"
    },
    "totalContentPieces": 9,
    "platforms": ["spotify", "youtube", "instagram", "tiktok"]
  },
  "metrics": {
    "aggregated": {
      "totalReach": 340700,
      "uniqueReach": 210350,
      "totalEngagements": 67200,
      "engagementRate": 19.7,
      "totalShares": 5843,
      "totalComments": 3412,
      "estimatedValue": 5430.75
    },
    "byPlatform": {
      "spotify": {
        "plays": 12500,
        "engagements": 1650,
        "shares": 320,
        "comments": 210
      },
      "youtube": {
        "views": 130000,
        "engagements": 22500,
        "shares": 2400,
        "comments": 1350
      },
      "instagram": {
        "views": 74000,
        "engagements": 39000,
        "shares": 2180,
        "comments": 1580
      },
      "tiktok": {
        "views": 215000,
        "engagements": 27000,
        "shares": 3250,
        "comments": 850
      }
    },
    "byContent": [
      {
        "id": "content-123",
        "title": "Marketing Strategies Podcast Episode #42",
        "platform": "spotify",
        "views": 12500,
        "engagements": 1650,
        "engagementRate": 13.2,
        "estimatedValue": 700.00
      },
      {
        "id": "content-124",
        "title": "Marketing Tips Video",
        "platform": "youtube",
        "parentId": "content-123",
        "views": 85000,
        "engagements": 15300,
        "engagementRate": 18.0,
        "estimatedValue": 1750.00
      }
      // Additional content items
    ]
  },
  "graph": {
    // Included when includeGraph=true
    "nodes": [
      {
        "id": "content-123",
        "title": "Marketing Strategies Podcast Episode #42",
        "platform": "spotify",
        "contentType": "podcast",
        "metrics": {
          "views": 12500,
          "engagements": 1650
        }
      },
      // Additional nodes
    ],
    "edges": [
      {
        "source": "content-123",
        "target": "content-124",
        "relationship": "parent_of"
      },
      // Additional edges
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/content/content-123/family?includeGraph=true
```

### Get Content Performance Comparison

Compares performance metrics between related content items or across time periods.

```
GET /analytics/comparison
```

#### Request Parameters

| Parameter    | Type     | Required | Description                                     |
|--------------|----------|----------|-------------------------------------------------|
| contentIds   | string[] | Yes      | IDs of content to compare                       |
| metric       | string   | Yes      | Primary metric for comparison                   |
| secondaryMetrics | string[] | No    | Additional metrics to include                   |
| startDate    | string   | No       | Start date (ISO 8601)                           |
| endDate      | string   | No       | End date (ISO 8601)                             |
| normalizePlatforms | boolean | No   | Standardize metrics across platforms (default: true) |

#### Response Format

```json
{
  "comparison": {
    "metric": "views",
    "secondaryMetrics": ["engagements", "engagementRate"],
    "timeframe": {
      "startDate": "2023-01-01",
      "endDate": "2023-01-31"
    },
    "items": [
      {
        "id": "content-123",
        "title": "Marketing Strategies Podcast Episode #42",
        "platform": "spotify",
        "metrics": {
          "views": 12500,
          "engagements": 1650,
          "engagementRate": 13.2
        }
      },
      {
        "id": "content-124",
        "title": "Marketing Tips Video",
        "platform": "youtube",
        "metrics": {
          "views": 85000,
          "engagements": 15300,
          "engagementRate": 18.0
        }
      },
      {
        "id": "content-125",
        "title": "Key Takeaways Carousel",
        "platform": "instagram",
        "metrics": {
          "views": 74000,
          "engagements": 39000,
          "engagementRate": 52.7
        }
      }
    ],
    "insights": [
      "Instagram content has the highest engagement rate at 52.7%",
      "YouTube content reaches the largest audience with 85,000 views",
      "TikTok derivatives generate 2.5x more views than the original podcast"
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/comparison?contentIds=content-123,content-124,content-125&metric=views&secondaryMetrics=engagements,engagementRate
```

## Audience Analytics

### Get Audience Demographics

Retrieves aggregated audience demographics across platforms.

```
GET /analytics/audience/demographics
```

#### Request Parameters

| Parameter | Type    | Required | Description                                     |
|-----------|---------|----------|-------------------------------------------------|
| platforms | string[] | No       | Filter by specific platforms                    |
| contentId | string  | No       | Filter for specific content family              |
| startDate | string  | No       | Start date (ISO 8601)                           |
| endDate   | string  | No       | End date (ISO 8601)                             |

#### Response Format

```json
{
  "demographics": {
    "ageRanges": {
      "13-17": 5.2,
      "18-24": 31.8,
      "25-34": 38.5,
      "35-44": 15.3,
      "45-54": 6.2,
      "55+": 3.0
    },
    "genderDistribution": {
      "male": 42.5,
      "female": 55.8,
      "other": 1.7
    },
    "geographicDistribution": {
      "countries": {
        "US": 45.3,
        "UK": 12.7,
        "Canada": 8.5,
        "Australia": 7.2,
        "Germany": 4.8,
        "Other": 21.5
      },
      "topCities": [
        {
          "name": "New York",
          "country": "US",
          "percentage": 6.8
        },
        {
          "name": "London",
          "country": "UK",
          "percentage": 5.3
        }
        // Additional cities
      ]
    },
    "interests": [
      {
        "category": "Technology",
        "percentage": 68.4
      },
      {
        "category": "Business",
        "percentage": 52.7
      },
      {
        "category": "Marketing",
        "percentage": 48.3
      }
      // Additional interests
    ],
    "byPlatform": {
      "youtube": {
        "ageRanges": {
          "18-24": 28.6,
          "25-34": 41.2
          // Additional age ranges
        },
        "genderDistribution": {
          "male": 48.5,
          "female": 49.8,
          "other": 1.7
        }
        // Additional demographic data
      }
      // Additional platforms
    }
  }
}
```

#### Example Request

```http
GET /api/analytics/audience/demographics?platforms=youtube,instagram,tiktok
```

### Get Audience Engagement Patterns

Identifies peak engagement times and patterns.

```
GET /analytics/audience/engagement-patterns
```

#### Request Parameters

| Parameter   | Type    | Required | Description                                     |
|-------------|---------|----------|-------------------------------------------------|
| platforms   | string[] | No       | Filter by specific platforms                    |
| contentId   | string  | No       | Filter for specific content family              |
| startDate   | string  | No       | Start date (ISO 8601)                           |
| endDate     | string  | No       | End date (ISO 8601)                             |
| granularity | string  | No       | Time granularity (hour, day, weekday) Default: hour |

#### Response Format

```json
{
  "engagementPatterns": {
    "peakEngagementTimes": {
      "hourly": [
        {
          "hour": 8,
          "engagementRate": 4.3,
          "timezone": "UTC"
        },
        {
          "hour": 18,
          "engagementRate": 6.8,
          "timezone": "UTC"
        }
        // Additional peak hours
      ],
      "daily": [
        {
          "day": "2023-01-15",
          "engagementRate": 5.7
        },
        {
          "day": "2023-01-22",
          "engagementRate": 6.2
        }
        // Additional peak days
      ],
      "weekday": [
        {
          "day": "Monday",
          "engagementRate": 3.8
        },
        {
          "day": "Wednesday",
          "engagementRate": 5.1
        },
        {
          "day": "Saturday",
          "engagementRate": 6.7
        }
        // Additional weekdays
      ]
    },
    "byPlatform": {
      "youtube": {
        "peakHours": [16, 20],
        "peakDays": ["Saturday", "Sunday"],
        "averageSessionDuration": 8.3
      },
      "instagram": {
        "peakHours": [12, 21],
        "peakDays": ["Wednesday", "Thursday"],
        "averageSessionDuration": 2.7
      },
      "tiktok": {
        "peakHours": [14, 22],
        "peakDays": ["Monday", "Friday"],
        "averageSessionDuration": 3.2
      }
    },
    "recommendations": [
      "Schedule YouTube content on weekends between 4-8PM UTC",
      "Post Instagram content on Wednesday and Thursday around lunch and evening",
      "TikTok audience is most engaged on Monday and Friday afternoons"
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/audience/engagement-patterns?granularity=weekday
```

## AI-Generated Insights

### Get Content Performance Insights

Retrieves AI-generated insights about content performance.

```
GET /analytics/insights/content
```

#### Request Parameters

| Parameter | Type    | Required | Description                                     |
|-----------|---------|----------|-------------------------------------------------|
| contentId | string  | No       | Filter for specific content                     |
| platforms | string[] | No       | Filter by specific platforms                    |
| startDate | string  | No       | Start date (ISO 8601)                           |
| endDate   | string  | No       | End date (ISO 8601)                             |
| limit     | number  | No       | Number of insights to return (default: 5)      |

#### Response Format

```json
{
  "insights": {
    "performance": [
      {
        "type": "trend",
        "description": "Your engagement rate has increased by 24% in the last 30 days",
        "confidence": 0.92,
        "metrics": {
          "previous": 4.2,
          "current": 5.2,
          "change": 24
        },
        "recommendation": "Continue focusing on interactive content that encourages comments"
      },
      {
        "type": "anomaly",
        "description": "Unusual spike in views on January 15th across platforms",
        "confidence": 0.88,
        "metrics": {
          "expected": 2500,
          "actual": 7800,
          "change": 212
        },
        "recommendation": "Analyze external factors that may have contributed to this spike"
      },
      {
        "type": "opportunity",
        "description": "Instagram Reels consistently outperform standard posts by 3.2x",
        "confidence": 0.95,
        "metrics": {
          "reels": 5600,
          "posts": 1750,
          "ratio": 3.2
        },
        "recommendation": "Allocate more resources to Reels content production"
      }
      // Additional insights
    ],
    "contentStrategy": [
      {
        "type": "optimization",
        "description": "Videos between 3-5 minutes generate 42% more engagement than longer videos",
        "confidence": 0.89,
        "recommendation": "Focus on concise, high-value content under 5 minutes for maximum engagement"
      },
      {
        "type": "topic",
        "description": "Technology tutorial content performs 35% better than review content",
        "confidence": 0.84,
        "recommendation": "Consider producing more how-to and educational content"
      }
      // Additional strategy insights
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/insights/content?limit=10
```

### Get Content Relationship Insights

Analyzes and provides insights about content relationships and derivative performance.

```
GET /analytics/insights/relationships
```

#### Request Parameters

| Parameter | Type    | Required | Description                                     |
|-----------|---------|----------|-------------------------------------------------|
| contentId | string  | No       | Filter for specific content family              |
| startDate | string  | No       | Start date (ISO 8601)                           |
| endDate   | string  | No       | End date (ISO 8601)                             |
| limit     | number  | No       | Number of insights to return (default: 5)       |

#### Response Format

```json
{
  "relationshipInsights": {
    "contentFamily": {
      "id": "content-123",
      "title": "Marketing Strategies Podcast Episode #42",
      "derivatives": 8,
      "platforms": ["spotify", "youtube", "instagram", "tiktok"]
    },
    "insights": [
      {
        "type": "derivative_performance",
        "description": "Instagram carousel derivatives generate 2.8x more engagement than direct YouTube uploads",
        "confidence": 0.93,
        "recommendation": "Consider creating more Instagram carousel derivatives from podcast content"
      },
      {
        "type": "platform_efficiency",
        "description": "TikTok derivatives reach 6.2x more unique viewers with 35% less production effort",
        "confidence": 0.87,
        "recommendation": "Prioritize short-form TikTok derivatives for maximum reach efficiency"
      },
      {
        "type": "content_journey",
        "description": "Users who discover content via TikTok clips are 3.4x more likely to consume the full podcast episode",
        "confidence": 0.82,
        "recommendation": "Use TikTok as a discovery channel with clear calls-to-action to the full episode"
      },
      {
        "type": "cross_promotion",
        "description": "Cross-platform promotion of content increases overall engagement by 43%",
        "confidence": 0.91,
        "recommendation": "Implement a structured cross-promotion strategy across all platforms"
      }
      // Additional insights
    ],
    "optimizationSuggestions": [
      {
        "type": "new_derivative",
        "description": "Based on audience interests, a LinkedIn carousel summarizing key insights could perform well",
        "confidence": 0.78,
        "platform": "linkedin",
        "contentType": "carousel"
      },
      {
        "type": "sequence_optimization",
        "description": "Publishing TikTok teasers 2 days before YouTube content increases YouTube views by 28%",
        "confidence": 0.83,
        "recommendation": "Implement a staggered release schedule across platforms"
      }
      // Additional suggestions
    ]
  }
}
```

#### Example Request

```http
GET /api/analytics/insights/relationships?contentId=content-123
```

## Error Responses

All endpoints follow the same error response format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found",
    "details": {
      "resourceType": "content",
      "resourceId": "invalid-id"
    }
  }
}
```

Common error codes include:

| Code                    | HTTP Status | Description                                      |
|-------------------------|-------------|--------------------------------------------------|
| UNAUTHORIZED            | 401         | Missing or invalid authentication token          |
| PERMISSION_DENIED       | 403         | Insufficient permissions for requested resource  |
| RESOURCE_NOT_FOUND      | 404         | Requested resource does not exist                |
| INVALID_PARAMETERS      | 400         | Invalid request parameters                       |
| RATE_LIMIT_EXCEEDED     | 429         | Rate limit exceeded for this endpoint            |
| SERVICE_UNAVAILABLE     | 503         | Service temporarily unavailable                  |
| INTERNAL_SERVER_ERROR   | 500         | Unexpected server error                          |