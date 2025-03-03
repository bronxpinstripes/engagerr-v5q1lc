# Contributing to Engagerr

Thank you for considering contributing to Engagerr! This document provides guidelines and instructions to help you contribute effectively to our platform that revolutionizes the creator economy by establishing a comprehensive two-sided marketplace.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [NextJS Component Architecture](#nextjs-component-architecture)
- [Testing Guidelines](#testing-guidelines)
- [Branch Strategy and Commit Messages](#branch-strategy-and-commit-messages)
- [Pull Request Process](#pull-request-process)
- [Documentation](#documentation)
- [Communication Channels](#communication-channels)
- [License](#license)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm (v9 or higher) or yarn (v1.22 or higher)
- Docker and Docker Compose (for AI container development)
- Git (v2.30 or higher)
- A code editor (VS Code recommended with extensions below)
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma

## Development Environment Setup

### 1. Fork and Clone the Repository

```bash
git clone https://github.com/yourusername/engagerr.git
cd engagerr
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then fill in the required values:

```
# Base configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe configuration (for development)
STRIPE_SECRET_KEY=your_stripe_test_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# AI API configuration
DEEPSEEK_API_KEY=your_deepseek_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Email service
RESEND_API_KEY=your_resend_api_key

# For local AI container development (optional)
AI_CONTAINER_URL=http://localhost:8000
```

### 4. Set Up Local Supabase

We recommend using Supabase CLI for local development:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Apply migrations
npx prisma migrate dev
```

### 5. Start the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at http://localhost:3000.

### 6. AI Container Setup (Optional)

For AI component development:

```bash
# Start the AI containers
docker-compose -f docker-compose.ai.yml up -d

# Verify containers are running
docker ps
```

## Project Structure

```
engagerr/
├── app/                # NextJS App Router structure
│   ├── api/            # API routes
│   ├── (auth)/         # Authentication routes
│   ├── (creator)/      # Creator-specific routes
│   ├── (brand)/        # Brand-specific routes
│   └── (shared)/       # Shared components and layouts
├── components/         # React components
│   ├── ui/             # Basic UI components
│   ├── analytics/      # Analytics components
│   ├── discovery/      # Discovery components
│   ├── forms/          # Form components
│   └── ai/             # AI-powered components
├── lib/                # Utility functions and shared code
│   ├── api/            # API clients and wrappers
│   ├── db/             # Database utilities
│   ├── ai/             # AI utilities
│   └── utils/          # Helper functions
├── prisma/             # Prisma schema and migrations
├── public/             # Static assets
├── styles/             # Global styles
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
├── ai-services/        # AI container services
│   ├── llama/          # Llama 3 service
│   └── mistral/        # Mistral service
└── scripts/            # Development and build scripts
```

## Coding Standards

### General Guidelines

- Follow the principle of single responsibility
- Keep functions small and focused
- Write self-documenting code with clear variable and function names
- Prefer explicit over implicit
- Follow SOLID principles

### TypeScript

- Use strict type checking
- Avoid `any` types when possible
- Use interfaces for object shapes
- Use type unions and intersections appropriately
- Document complex types

### Linting and Formatting

We use ESLint and Prettier for code quality and formatting:

```bash
# Check code style
npm run lint

# Format code
npm run format
```

Our linting configuration enforces:
- No unused variables
- No console statements in production code
- Consistent import ordering
- Proper React Hooks usage
- Accessibility (a11y) best practices

### CSS/Styling

We use Tailwind CSS with the following conventions:
- Use utility classes for most styling
- Create component classes for repeated patterns
- Follow mobile-first responsive design
- Keep specificity low

## NextJS Component Architecture

### Server vs. Client Components

We use a strategic mix of server and client components:

- **Server Components** for:
  - Data fetching
  - Components that don't need interactivity
  - SEO-critical content

- **Client Components** for:
  - Interactive UI elements
  - Components that use browser APIs
  - Components with client-side state

Mark client components with the `"use client"` directive at the top of the file.

### Component Organization

- Place components in logical feature folders
- Use index.ts files for clean exports
- Co-locate test files with components
- Follow the pattern of smart/presentational component separation

### Data Fetching

- Use React Query for client-side data fetching
- Use server components for initial data loading
- Implement proper error handling and loading states
- Cache data appropriately

### State Management

- Use React's built-in state for simple component state
- Use React Context for shared state within feature boundaries
- Use Zustand for global UI state
- Use React Query for server state

## Testing Guidelines

We prioritize comprehensive testing at multiple levels:

### Unit Testing

- Test individual functions and components in isolation
- Use Jest and React Testing Library
- Mock external dependencies
- Aim for >80% code coverage

```bash
# Run unit tests
npm run test

# Run with coverage report
npm run test:coverage
```

### Integration Testing

- Test interactions between components
- Test API routes with SuperTest
- Test database operations with a test database

```bash
# Run integration tests
npm run test:integration
```

### End-to-End Testing

- Use Playwright for E2E tests
- Test critical user flows
- Run against staging environment

```bash
# Run E2E tests
npm run test:e2e
```

### AI Component Testing

For testing AI-powered components:

- Create test fixtures with predetermined outputs
- Mock AI API responses for deterministic testing
- Test fallback mechanisms and error handling
- Verify prompt engineering with specialized test cases

## Branch Strategy and Commit Messages

### Branch Naming Convention

- `feature/short-description` - For new features
- `bugfix/issue-description` - For bug fixes
- `hotfix/critical-issue` - For critical production fixes
- `refactor/component-name` - For code refactoring
- `docs/update-area` - For documentation updates

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect code functionality
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Changes to build process or tooling

Example:
```
feat(analytics): implement cross-platform metrics aggregation

This adds the ability to aggregate metrics across multiple platforms
and standardize engagement rates.

Closes #123
```

## Pull Request Process

1. **Create a Pull Request** from your forked repository
2. **Fill out the PR template** with details about your changes
3. **Link any related issues** using keywords (Fixes, Resolves, Closes)
4. **Ensure all tests pass** and CI checks are green
5. **Request at least two reviewers** from the core team
6. **Address any feedback** from code reviews
7. **Update documentation** to reflect your changes
8. **Wait for approval** from two team members before merging

### PR Review Criteria

PRs are evaluated based on:
- Code quality and adherence to standards
- Test coverage and passing tests
- Documentation quality
- Performance considerations
- Security implications

## Documentation

- Update relevant documentation with code changes
- Document complex functions and components
- Use JSDoc format for code documentation
- Update the README.md if necessary
- Add examples for new features

## Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and community discussions
- **Pull Requests**: For code contributions and reviews
- **Slack**: For real-time communication (invitation upon request)

## License

By contributing to Engagerr, you agree that your contributions will be licensed under the project's MIT License. All contributions are subject to the [Developer Certificate of Origin](https://developercertificate.org/).

---

Thank you for contributing to Engagerr! Your efforts help us build a platform that empowers content creators and brands to collaborate effectively.