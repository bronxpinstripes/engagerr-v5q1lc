# Engagerr Backend Services

This document provides comprehensive documentation for the backend services of Engagerr, the platform that revolutionizes the creator economy by providing unified analytics across platforms and facilitating data-driven partnerships between creators and brands.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Core Components](#core-components)
- [Development Workflow](#development-workflow)
- [Multi-model AI Architecture](#multi-model-ai-architecture)
- [Integration Framework](#integration-framework)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

Engagerr's backend is built on NextJS with a server-client architecture that leverages server components for data-heavy operations and client components for interactive elements. The backend provides:

- Unified analytics across social platforms with standardized metrics
- Content relationship mapping using graph database structures
- AI-powered creator-brand matching and content insights
- Secure transaction management with milestone-based payments
- Integration with multiple social platforms, payment processors, and AI services

## Technology Stack

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | NextJS | 14.0+ | Server components, API routes, full-stack capabilities |
| Language | TypeScript | 5.0+ | Type-safe programming across backend services |
| Database | PostgreSQL (Supabase) | 15+ | Relational data storage with graph capabilities |
| ORM | Prisma | 5.0+ | Type-safe database access and migrations |
| Authentication | Supabase Auth | Latest | User authentication and session management |
| File Storage | Supabase Storage | Latest | Media and document storage with CDN capabilities |

### AI Technologies

| Technology | Type | Purpose |
|------------|------|---------|
| DeepSeek API | Cloud API | General language tasks and creative generation |
| Llama 3 | Self-hosted containerized | Content analysis and relationship detection |
| CLIP/BLIP | Hugging Face Inference API | Visual content analysis |
| Mistral | Self-hosted containerized | Content classification and initial matching |

### Third-party Services

| Service | Purpose | Integration Method |
|---------|---------|-------------------|
| Stripe | Payment processing, subscription management | API with webhooks |
| Resend | Transactional email delivery | API integration |
| Social Platform APIs | Content and metrics retrieval | OAuth and REST APIs |
| Vercel | Hosting, serverless functions, edge caching | Built-in integration |
| Sentry | Error monitoring and debugging | Client and server SDK |

## Project Structure

```
src/
├── backend/               # Backend-specific code
│   ├── ai/                # AI model integrations and routers
│   │   ├── containers/    # Docker configuration for self-hosted models
│   │   ├── models/        # Model-specific adapters
│   │   └── router.ts      # AI task routing logic
│   ├── analytics/         # Analytics processing services
│   │   ├── normalizers/   # Platform-specific metric normalizers
│   │   ├── processors/    # Data processing utilities 
│   │   └── insights/      # Insight generation services
│   ├── auth/              # Authentication and authorization
│   ├── db/                # Database schema and utilities
│   │   ├── migrations/    # Prisma migrations
│   │   ├── schema.prisma  # Prisma schema
│   │   └── seed.ts        # Database seeding
│   ├── discovery/         # Creator discovery services
│   ├── integration/       # Platform integration services
│   │   ├── platforms/     # Platform-specific adapters
│   │   └── webhooks/      # Webhook handlers
│   ├── transaction/       # Payment and contract services
│   │   ├── escrow/        # Escrow service
│   │   ├── contracts/     # Contract generation
│   │   └── payment/       # Payment processing
│   └── utils/             # Shared utilities
├── app/                   # Next.js App Router files
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics API endpoints
│   │   ├── ai/            # AI processing endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── content/       # Content management endpoints
│   │   ├── discovery/     # Creator discovery endpoints
│   │   ├── integration/   # Integration endpoints
│   │   ├── transactions/  # Transaction endpoints
│   │   └── webhooks/      # Webhook endpoints
│   └── ...                # Frontend routes
├── components/            # React components
├── lib/                   # Shared library code
└── ...
```

## Prerequisites

Before setting up the Engagerr backend, ensure you have the following:

- Node.js 18.x or later
- npm 8.x or later (or yarn 1.22.x or later)
- Docker and Docker Compose (for running AI containers locally)
- Supabase account (for database, auth, and storage)
- Stripe account (for payment processing)
- Social platform developer accounts for API access:
  - YouTube Data API access
  - Instagram Graph API access
  - TikTok API access
  - Twitter/X API access
  - LinkedIn API access (optional)
- DeepSeek API key (for AI capabilities)
- Hugging Face API key (for CLIP/BLIP model access)

## Setup Instructions

Follow these steps to set up your development environment:

1. **Clone the repository and navigate to the project directory**

   ```bash
   git clone https://github.com/your-org/engagerr.git
   cd engagerr
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**

   Copy the `.env.example` file to `.env.local` and fill in the required values:

   ```bash
   cp .env.example .env.local
   ```

   Key environment variables include:

   ```
   # Next.js
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   
   # Email
   RESEND_API_KEY=your_resend_api_key
   
   # AI APIs
   DEEPSEEK_API_KEY=your_deepseek_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   
   # Social Platforms API Keys
   YOUTUBE_API_KEY=your_youtube_api_key
   INSTAGRAM_APP_ID=your_instagram_app_id
   INSTAGRAM_APP_SECRET=your_instagram_app_secret
   TIKTOK_APP_ID=your_tiktok_app_id
   TIKTOK_APP_SECRET=your_tiktok_app_secret
   # Add other platform keys as needed
   ```

4. **Set up database with Prisma**

   ```bash
   # Push schema to your Supabase database
   npx prisma db push
   
   # Optional: Seed the database with sample data
   npx prisma db seed
   ```

5. **Start AI containers (optional for local development)**

   If you want to run the AI models locally:

   ```bash
   # Navigate to the containers directory
   cd src/backend/ai/containers
   
   # Start the containers
   docker-compose up -d
   ```

   Note: This requires significant computational resources, especially for the Llama 3 model. For development, you can use the DeepSeek API exclusively by setting `USE_LOCAL_AI_MODELS=false` in your `.env.local`.

6. **Start the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will start at http://localhost:3000.

## API Documentation

Engagerr's API follows REST principles with predictable resource-oriented URLs and appropriate HTTP methods.

### Authentication

All API routes (except public endpoints) require authentication using JWT tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Or for errors:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Rate Limiting

API endpoints are rate-limited to ensure system stability. Rate limits vary by endpoint and user subscription tier.

### Key API Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/api/auth/*` | Various | Authentication endpoints | Varies |
| `/api/analytics/[platformId]` | GET | Platform-specific metrics | Required |
| `/api/content/[contentId]/family` | GET | Content relationship data | Required |
| `/api/metrics/aggregate` | GET | Standardized cross-platform metrics | Required |
| `/api/insights/[creatorId]` | GET | AI-generated performance insights | Required |
| `/api/discovery/search` | POST | Multi-criteria creator search | Required |
| `/api/discovery/recommend` | GET | AI-enhanced recommendations | Required |
| `/api/creators/[creatorId]` | GET | Creator profile and metrics | Required |
| `/api/brands/[brandId]/saved` | GET | Saved searches and favorites | Required |
| `/api/ai/analyze` | POST | Content analysis endpoint | Required |
| `/api/ai/relationships` | POST | Content relationship detection | Required |
| `/api/ai/suggestions` | GET | Creative repurposing suggestions | Required |
| `/api/subscriptions` | Various | Subscription management | Required |
| `/api/payments/escrow` | Various | Escrow management | Required |
| `/api/contracts` | Various | Contract generation and management | Required |
| `/api/integrations/[platform]/connect` | GET | Platform connection | Required |
| `/api/webhooks/[service]` | POST | Webhook handlers | Varies |

Detailed API documentation is available in the [API Reference](API_REFERENCE.md) document.

## Core Components

### Analytics Engine

The Analytics Engine is responsible for processing, standardizing, and visualizing creator content performance across platforms:

- **Data Normalizer**: Converts platform-specific metrics into standard definitions
- **Relationship Processor**: Maintains the hierarchical content relationship graph
- **Metrics Calculator**: Processes standardized data and relationship information to produce comprehensive analytics
- **Insight Generator**: Analyzes computed metrics to produce actionable insights
- **Visualization Renderer**: Transforms analytics data into visual representations

Key features:
- Cross-platform metric standardization
- Parent-child content relationship tracking
- Total reach and engagement calculation
- Performance trends and pattern detection
- Audience overlap estimation

### Discovery Marketplace

The Discovery Marketplace facilitates connections between brands and creators:

- **Search Engine**: Provides sophisticated creator discovery based on multiple criteria
- **Matching System**: Uses AI to connect brands with relevant creators
- **Profile System**: Manages comprehensive creator and brand profiles
- **Communication Hub**: Facilitates interactions between brands and creators

Key features:
- Multi-criteria creator search and filtering
- AI-powered compatibility scoring
- Standardized metrics presentation
- Secure messaging and proposal exchange

### AI Processing System

The AI Processing System implements a multi-model architecture to optimize for different tasks:

- **Model Selection Engine**: Routes requests to the appropriate AI model
- **Content Analysis Module**: Processes content across formats to extract insights
- **Relationship Detection Module**: Identifies connections between content items
- **Recommendation Engine**: Generates personalized suggestions

Key features:
- Task-specific model selection
- Specialized models for different content types
- Fallback mechanisms for reliability
- Result caching for performance

### Transaction Management

The Transaction Management system handles all financial aspects of the platform:

- **Subscription Manager**: Handles subscription-related functionality
- **Marketplace Payment Processor**: Manages creator-brand financial transactions
- **Escrow Service**: Secures payments during partnership execution
- **Contract Manager**: Handles legal agreements between parties

Key features:
- Secure payment processing via Stripe
- Milestone-based escrow system
- Dynamic contract generation
- Subscription management with tiered plans

### Integration Framework

The Integration Framework connects Engagerr with external platforms and services:

- **Platform Adapters**: Provide standardized interfaces to diverse social media platforms
- **Authentication Manager**: Secures platform integration credentials
- **Rate Limiter**: Manages API request quotas to prevent throttling
- **Webhook Handler**: Processes asynchronous events from external platforms

Key features:
- OAuth-based platform authentication
- Standardized data transformation
- Rate limit awareness and backoff strategies
- Webhook verification and processing

## Development Workflow

### Branching Strategy

We follow a GitHub Flow branching strategy:

1. Create feature branches from `main` using the format `feature/feature-name`
2. Create bugfix branches using the format `fix/bug-name`
3. Submit PRs to `main`
4. After review and approval, merge to `main`
5. `main` is automatically deployed to staging
6. Production deployments are manual promotions from staging

### Code Style and Linting

We maintain code quality through automated linting and formatting:

- ESLint for code linting
- Prettier for code formatting
- TypeScript for type checking

Run checks locally:

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Format code
npm run format
```

These checks are also run automatically in the CI pipeline.

### Pull Request Process

1. Create a branch from `main`
2. Make your changes and commit them
3. Push your branch and create a PR
4. Ensure CI checks pass
5. Request reviews from appropriate team members
6. Address any feedback
7. Once approved, merge to `main`

### CI/CD Integration

Our CI/CD pipeline automates testing and deployment:

1. On PR creation: runs linting, type checking, and unit tests
2. On merge to `main`: deploys to staging environment and runs E2E tests
3. Production deployment: manual promotion from staging with approval

## Multi-model AI Architecture

Engagerr uses a specialized multi-model AI architecture to optimize for different tasks while maintaining efficiency and cost-effectiveness.

### Model Architecture

```
DeepSeek API (cloud) - General language tasks, creative content
Llama 3 (self-hosted) - Content analysis, relationship detection
CLIP/BLIP (Hugging Face) - Visual content analysis
Mistral (self-hosted) - Classification, initial matching
```

### Model Selection Logic

Tasks are routed to the appropriate model based on:

1. Task type (text analysis, image analysis, classification, etc.)
2. Complexity requirements
3. Performance needs
4. Cost considerations

For example:
- Content classification → Mistral (efficient classification model)
- Detailed content analysis → Llama 3 (optimized for comprehensive analysis)
- Creative suggestions → DeepSeek (strongest creative capabilities)
- Image/video content → CLIP/BLIP (specialized for visual content)

### Self-hosted Model Setup

For local development with self-hosted models:

1. Navigate to the containers directory:
   ```bash
   cd src/backend/ai/containers
   ```

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

3. Verify the models are running:
   ```bash
   docker-compose ps
   ```

The containers expose the following endpoints:
- Llama 3: http://localhost:8000
- Mistral: http://localhost:8001

### Fallback Mechanisms

The AI system implements graceful degradation:

1. Primary model unavailable → fall back to secondary model
2. All local models unavailable → fall back to cloud API
3. All AI unavailable → fall back to rule-based processing

Configure fallback behavior in `.env.local`:
```
AI_FALLBACK_ENABLED=true
AI_FALLBACK_STRATEGY=sequential
```

## Integration Framework

The Integration Framework connects Engagerr with external platforms and services through a unified interface.

### Social Platform Integrations

Engagerr integrates with major social media platforms:

| Platform | API Version | Authentication | Webhook Support |
|----------|-------------|----------------|----------------|
| YouTube | Data API v3 | OAuth 2.0 | Yes |
| Instagram | Graph API | OAuth 2.0 | Yes |
| TikTok | TikTok API | OAuth 2.0 | Yes |
| Twitter/X | API v2 | OAuth 2.0 | Yes |
| LinkedIn | Marketing API | OAuth 2.0 | Limited |

#### Adding a Platform Connection

To connect a user's social platform account:

1. Initialize the OAuth flow:
   ```typescript
   const authUrl = await platformAdapter.getAuthorizationUrl(userId, redirectUri);
   // Redirect user to authUrl
   ```

2. Handle the OAuth callback:
   ```typescript
   // In your callback route handler
   const tokens = await platformAdapter.handleCallback(code);
   await storeTokens(userId, platformId, tokens);
   ```

3. Fetch content and metrics:
   ```typescript
   const content = await platformAdapter.fetchContent(userId);
   const metrics = await platformAdapter.fetchMetrics(userId, contentId);
   ```

### Payment Processing Integration

Engagerr uses Stripe for subscription billing and marketplace transactions:

1. Subscription setup:
   ```typescript
   const session = await stripe.checkout.sessions.create({
     mode: 'subscription',
     payment_method_types: ['card'],
     line_items: [{
       price: priceId,
       quantity: 1,
     }],
     success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
     cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`,
   });
   ```

2. Marketplace payment (escrow):
   ```typescript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: amount * 100, // Convert to cents
     currency: 'usd',
     payment_method_types: ['card'],
     metadata: {
       partnershipId,
       type: 'escrow',
     },
   });
   ```

3. Webhook handling:
   ```typescript
   // In webhook handler
   const event = stripe.webhooks.constructEvent(
     request.body,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET
   );
   
   if (event.type === 'payment_intent.succeeded') {
     await handleSuccessfulPayment(event.data.object);
   }
   ```

### Email Service Integration

Engagerr uses Resend for transactional emails:

```typescript
const { data, error } = await resend.emails.send({
  from: 'Engagerr <noreply@engagerr.com>',
  to: [userEmail],
  subject: 'Welcome to Engagerr',
  react: EmailTemplate({ name: userName }),
});
```

## Testing

### Testing Strategy

Engagerr implements a comprehensive testing strategy:

1. **Unit Tests**: For individual functions and components
2. **Integration Tests**: For API routes and database operations
3. **End-to-End Tests**: For complete user flows

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Writing Tests

We use Jest for unit and integration tests, and Playwright for E2E tests:

```typescript
// Example unit test
describe('Analytics Normalizer', () => {
  it('should normalize YouTube metrics correctly', async () => {
    const rawMetrics = { /* ... */ };
    const normalized = normalizeYouTubeMetrics(rawMetrics);
    expect(normalized.views).toBeDefined();
    expect(normalized.engagementRate).toBeGreaterThan(0);
  });
});

// Example API route test
describe('GET /api/content/:contentId/family', () => {
  it('should return content family when authenticated', async () => {
    const response = await request(app)
      .get('/api/content/test-content-id/family')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.nodes).toHaveLength(5);
  });
});
```

### Test Coverage

We aim for minimum test coverage of:
- 80% overall code coverage
- 90% coverage for core business logic
- 95% coverage for critical path operations

## Deployment

### Environments

| Environment | URL | Purpose | Deployment Method |
|-------------|-----|---------|------------------|
| Development | Local | Local development | Manual |
| Preview | PR-specific URLs | PR testing | Automatic on PR |
| Staging | https://staging.engagerr.com | Pre-production testing | Automatic on merge to main |
| Production | https://engagerr.com | Live application | Manual promotion from staging |

### Deployment Process

1. Code is pushed to GitHub
2. CI pipeline runs tests and builds the application
3. On successful build, the application is deployed to the appropriate environment
4. Database migrations are applied automatically
5. Post-deployment verification tests run
6. Monitoring confirms successful deployment

### Database Migrations

Database migrations are managed through Prisma:

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations (done automatically in deployment)
npx prisma migrate deploy
```

### Environment Configuration

Each environment has its own set of environment variables configured in Vercel:

1. Development: `.env.local`
2. Preview: Vercel Preview Environment Variables
3. Staging: Vercel Staging Environment Variables
4. Production: Vercel Production Environment Variables

## Monitoring

### Logging

Logs are collected from multiple sources:

- Application logs: Vercel Logs
- Error tracking: Sentry
- Database logs: Supabase Logs
- AI service logs: Container logs

### Performance Monitoring

Key metrics monitored:

- API response times
- Database query performance
- AI processing times
- Error rates
- Resource utilization

### Alerts

Alerts are configured for:

- Service availability issues
- High error rates
- Performance degradation
- Resource constraints
- Integration failures

Alert channels include:
- Slack for team notifications
- Email for daily/weekly reports
- PagerDuty for critical issues

## Troubleshooting

### Common Issues

1. **Authentication failures**
   - Check token validity
   - Verify user permissions
   - Ensure proper headers

2. **Database connection issues**
   - Verify connection string
   - Check IP allowlist
   - Confirm database user permissions

3. **AI processing errors**
   - Check container status for self-hosted models
   - Verify API keys for cloud services
   - Check rate limiting status

4. **Social platform integration issues**
   - Verify OAuth tokens
   - Check for API changes
   - Confirm rate limit status

### Logs and Debugging

Access logs through:

- Vercel Dashboard: Application logs
- Sentry Dashboard: Error details
- Supabase Dashboard: Database logs
- Container logs: `docker logs container_name`

### Support Resources

- Internal documentation: https://docs.internal.engagerr.com
- GitHub Issues: For bug reports and feature requests
- Slack: #engagerr-backend channel for team communication
- Weekly Engineering Office Hours: For complex questions

---

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to the Engagerr backend.

## License

This project is proprietary and confidential. Unauthorized copying, transfer, or use is strictly prohibited.