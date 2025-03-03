# Engagerr Web Application

<p align="center">
  <img src="public/logo.svg" alt="Engagerr Logo" width="200" />
</p>

## Overview

Frontend web application for the Engagerr platform - revolutionizing the creator economy by establishing a comprehensive two-sided marketplace that addresses the fragmentation of creator analytics and brand partnership processes. The web interface serves both content creators and brands, providing sophisticated content relationship tracking, analytics unification, and partnership management.

## Key Features

- **Content Relationship Mapping**: Interactive visualization of content relationships across platforms
- **Cross-Platform Analytics**: Unified analytics dashboard with standardized metrics
- **Media Kit Generator**: Tools for creators to generate professional media kits
- **Creator Discovery**: Advanced search and filtering for brands seeking creators
- **Campaign Management**: End-to-end management of brand campaigns and partnerships
- **Messaging System**: Integrated communication between creators and brands
- **Partnership Workflow**: Comprehensive tools for managing the entire partnership lifecycle

## Tech Stack

- **Framework**: NextJS 14.0+ with App Router architecture
- **UI Library**: React 18.0+
- **Language**: TypeScript 5.0+
- **Styling**: TailwindCSS 3.3+ with Shadcn UI 0.5+
- **State Management**: React Query 5.0+, Context API
- **Form Handling**: React Hook Form 7.45+ with Zod 3.22+ validation
- **Data Visualization**: Recharts 2.7+, D3.js 7.8+
- **Authentication**: Supabase Auth via NextAuth.js
- **API Communication**: Custom API client with fetch
- **Testing**: Jest, React Testing Library, Playwright

## Getting Started

### Prerequisites

- Node.js 18.0+
- npm or yarn
- Git

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-org/engagerr.git
   cd engagerr
   ```

2. Install dependencies
   ```bash
   cd src/web
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your development environment values.

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
/src/web
├── app/                # NextJS App Router pages and API routes
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── creator/        # Creator interface pages
│   ├── brand/          # Brand interface pages
│   ├── messages/       # Messaging interface
│   └── page.tsx        # Landing page
├── components/         # React components
│   ├── ui/             # UI components (buttons, inputs, etc.)
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   ├── shared/         # Shared components
│   ├── creator/        # Creator-specific components
│   └── brand/          # Brand-specific components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and libraries
├── public/             # Static assets
├── styles/             # Global styles
├── tests/              # Unit and integration tests
├── types/              # TypeScript type definitions
├── e2e/                # End-to-end tests
└── .env.example        # Example environment variables
```

## Development Workflow

### Code Style and Linting

We use ESLint and Prettier for code linting and formatting. Run linting checks with:

```bash
npm run lint
# or
yarn lint
```

Format code with Prettier:

```bash
npm run format
# or
yarn format
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for feature development
- `feature/*` - Feature branches for active development
- `bugfix/*` - Bug fix branches

### Pull Request Process

1. Create a feature or bugfix branch from `develop`
2. Implement your changes with appropriate tests
3. Ensure all tests pass and linting is clean
4. Submit a PR to `develop` branch
5. Request review from team members
6. Address feedback and get approval
7. Merge to `develop`

## Testing

### Unit and Integration Tests

We use Jest and React Testing Library for unit and integration tests. Run tests with:

```bash
npm test
# or
yarn test
```

Run tests in watch mode during development:

```bash
npm test:watch
# or
yarn test:watch
```

### End-to-End Tests

We use Playwright for end-to-end testing. Run E2E tests with:

```bash
npm run test:e2e
# or
yarn test:e2e
```

### Test Coverage

Generate test coverage reports with:

```bash
npm run test:coverage
# or
yarn test:coverage
```

We aim for a minimum of 80% code coverage for all production code.

## Building and Deployment

### Building for Production

Build the application for production:

```bash
npm run build
# or
yarn build
```

Preview the production build locally:

```bash
npm run start
# or
yarn start
```

### Deployment

The application is deployed using Vercel's CI/CD pipeline. Every push to the `main` branch triggers a production deployment, while pushes to other branches create preview deployments.

Specific deployment instructions and environment configuration can be found in the [deployment documentation](../docs/setup/deployment.md).

## Environment Variables

The following environment variables are required for the application to function properly:

```
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Authentication
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# External Services
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

See `.env.example` for a complete list of supported environment variables.

## Scripts Reference

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting checks
- `npm run format` - Format code with Prettier
- `npm test` - Run unit and integration tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:coverage` - Generate test coverage report
- `npm run type-check` - Run TypeScript type checking

## Additional Documentation

- [Architecture Overview](../docs/architecture/overview.md)
- [Authentication System](../docs/architecture/authentication.md)
- [Content Mapping System](../docs/architecture/content-mapping.md)
- [Analytics System](../docs/architecture/analytics.md)
- [AI System](../docs/architecture/ai-system.md)
- [API Documentation](../docs/api/)
- [Creator User Guide](../docs/user-guides/creator.md)
- [Brand User Guide](../docs/user-guides/brand.md)

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the terms specified in the [LICENSE](../../LICENSE) file.