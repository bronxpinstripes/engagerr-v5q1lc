# Engagerr

<p align="center">
  <img src="public/engagerr-logo.svg" alt="Engagerr Logo" width="200" />
</p>

A comprehensive platform that connects content creators and brands through unified analytics and content relationship tracking.

## Overview

Engagerr revolutionizes the creator economy by establishing a comprehensive two-sided marketplace that addresses the fragmentation of creator analytics and brand partnership processes. By leveraging advanced AI and sophisticated content relationship tracking, the platform creates unprecedented transparency and efficiency in creator-brand collaborations.

## Key Features

- **Content Relationship Mapping**: Proprietary technology that tracks hierarchical content relationships from long-form to micro-content derivatives
- **Cross-Platform Analytics**: Unified metrics that standardize performance data across different social media platforms
- **AI-Powered Matching**: Advanced algorithms that connect brands with relevant creators based on multiple factors
- **Creator Discovery**: Sophisticated search and filtering for brands to find perfect partnership matches
- **Partnership Management**: End-to-end workflow from proposal to contract and payment
- **Media Kit Generation**: Automated creation of professional media kits for creators
- **Secure Transactions**: Escrow-based payment system for creator-brand partnerships

## Technical Architecture

- NextJS 14+ with App Router architecture
- Server and Client components for optimal rendering strategy
- PostgreSQL with LTREE extension for content relationship graphs
- Multi-model AI system (DeepSeek, Llama 3, CLIP/BLIP, Mistral)
- Supabase for authentication, database, and storage
- Stripe for payment processing
- Vercel for deployment and edge functions

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Docker and Docker Compose for AI containers
- Supabase account
- Stripe account
- Social platform developer accounts for API access

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/your-org/engagerr.git
   cd engagerr
   npm install
   ```

2. Set up environment variables:
   ```bash
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the development server:
   ```bash
   # Start development environment
   npm run dev
   ```

### AI Model Setup

For the AI functionality, you need to start the model containers:

```bash
# Start AI containers
docker-compose -f docker-compose.ai.yml up -d
```

## Project Structure

- `src/app/` - NextJS App Router with pages and layouts
- `src/components/` - Reusable UI components (server and client)
- `src/lib/` - Utility functions, hooks, and shared logic
- `src/api/` - API routes and service integrations
- `src/db/` - Database models, migrations, and queries
- `src/ai/` - AI model integrations and processing logic
- `public/` - Static assets and resources
- `infrastructure/` - Deployment configurations and infrastructure scripts
- `docs/` - Technical documentation and user guides

## Development

### Running Tests

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy from the main branch
4. Set up automatic deployments for future updates

### AI Container Deployment

For deploying the AI containers to production:

```bash
# Build production AI containers
docker-compose -f docker-compose.ai.prod.yml build

# Deploy to your container hosting service
# (Instructions will depend on your hosting provider)
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [API Documentation](docs/api/README.md)
- [User Guides](docs/user-guides/README.md)
- [AI Model Documentation](docs/ai/README.md)
- [Database Schema](docs/database/schema.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.