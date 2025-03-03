## Engagerr Platform Local Development Guide

### Introduction

This document provides a comprehensive guide for setting up the Engagerr platform for local development. It covers all components including environment configuration, database setup, external service integration, and containerized AI services.

The Engagerr platform utilizes a modern architecture, leveraging Next.js for the frontend and backend, PostgreSQL for the database, and containerized AI models for specialized processing. This guide will walk you through setting up each of these components on your local machine.

#### Platform Architecture

The Engagerr platform consists of the following key components:

-   **Frontend**: A Next.js application that provides the user interface for both content creators and brands.
-   **Backend**: A Next.js API routes that handles API requests and business logic.
-   **Database**: A PostgreSQL database that stores all application data, including user profiles, content metadata, and analytics.
-   **AI Services**: Containerized AI models that provide content analysis, relationship detection, and other AI-powered features.
-   **External Services**: Integrations with third-party services such as Stripe for payment processing and social media platforms for data retrieval.

#### Development Workflow

The development workflow typically involves the following steps:

1.  Clone the repository from GitHub.
2.  Install dependencies for both the frontend and backend.
3.  Configure environment variables for local development.
4.  Set up the database and apply schema migrations.
5.  Start the frontend and backend development servers.
6.  Develop and test new features.
7.  Run tests to ensure code quality.
8.  Commit and push changes to GitHub.

For a detailed overview of the platform architecture, refer to the [Architecture Overview](docs/architecture/overview.md) document.

After completing the local setup, proceed to the [Deployment Guide](docs/setup/deployment.md) for production deployment instructions.

### Prerequisites

Before you begin, ensure you have the following software, accounts, and tools installed and configured:

-   [ ] **Node.js (>= 18.17.0)**: JavaScript runtime environment.
-   [ ] **npm or yarn**: Package managers for installing JavaScript dependencies.
-   [ ] **Docker and Docker Compose**: Containerization platform for running AI services.
-   [ ] **Git**: Version control system for managing code changes.
-   [ ] **PostgreSQL client (optional)**: For direct database interaction.
-   [ ] **Supabase CLI**: Command-line interface for managing Supabase projects.
-   [ ] **IDE recommendation (VS Code with extensions)**: Integrated development environment for code editing and debugging.
-   [ ] **Optional NVIDIA GPU for AI model acceleration**: For faster AI model processing.
-   [ ] **Accounts needed**:
    -   GitHub
    -   Supabase
    -   Stripe (test)
    -   DeepSeek AI
-   [ ] **API keys for external services (can use test/development keys)**:
    -   Stripe API keys
    -   DeepSeek AI API key
    -   Social media platform API keys

### Repository Setup

1.  **Clone the repository from GitHub**:

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2.  **Install dependencies for both frontend and backend**:

    ```bash
    cd src/web
    npm install # or yarn install

    cd ../backend
    npm install # or yarn install
    ```

3.  **Create environment files from examples**:

    ```bash
    cd src/web
    cp .env.example .env

    cd ../backend
    cp .env.example .env
    ```

4.  **Project structure explanation**:

    -   `src/web`: Contains the frontend Next.js application.
    -   `src/backend`: Contains the backend Next.js API routes and services.
    -   `docs`: Contains documentation files.
    -   `terraform`: Contains infrastructure as code configurations.

5.  **Initial configuration steps**:

    -   Configure Git hooks for code formatting and linting.
    -   Set up your IDE with recommended extensions for TypeScript and Next.js development.

### Environment Configuration

1.  **Copy .env.example to .env in both src/backend and src/web directories**:

    ```bash
    cp src/backend/.env.example src/backend/.env
    cp src/web/.env.example src/web/.env
    ```

2.  **Configure Supabase connection details**:

    -   Set the `DATABASE_URL` environment variable to your local Supabase PostgreSQL connection string.
    -   Set the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables to your local Supabase project URL and anonymous key.

3.  **Set up development API keys for Stripe, DeepSeek, and other services**:

    -   Obtain test API keys from the Stripe dashboard.
    -   Obtain a DeepSeek AI API key from the DeepSeek AI website.
    -   Configure the API keys in the `.env` files.

4.  **Configure local URLs and ports**:

    -   Set the `BASE_URL` environment variable to `http://localhost:3000`.
    -   Ensure that the frontend and backend development servers are running on the default ports (3000 and 3001, respectively).

5.  **Set up feature flags for development**:

    -   Enable or disable features using environment variables.
    -   For example, set `ENABLE_AI_CONTENT_MAPPING=true` to enable AI-powered content mapping.

6.  **Explanation of critical environment variables**:

    -   `DATABASE_URL`: PostgreSQL connection string.
    -   `SUPABASE_URL`: Supabase project URL.
    -   `SUPABASE_ANON_KEY`: Supabase anonymous key.
    -   `STRIPE_SECRET_KEY`: Stripe secret key.
    -   `DEEPSEEK_API_KEY`: DeepSeek AI API key.
    -   `ENABLE_AI_CONTENT_MAPPING`: Enable or disable AI-powered content mapping.

7.  **Environment validation steps**:

    -   Verify that all required environment variables are set.
    -   Check that the Supabase connection is working.
    -   Ensure that the API keys are valid.

### Database Setup

1.  **Install Supabase CLI**:

    ```bash
    npm install -g supabase
    ```

2.  **Initialize local Supabase instance with Docker**:

    ```bash
    supabase init
    supabase start
    ```

3.  **Configure PostgreSQL with required extensions (LTREE)**:

    ```sql
    CREATE EXTENSION IF NOT EXISTS ltree;
    ```

4.  **Running database migrations using Prisma**:

    ```bash
    cd src/backend
    npx prisma migrate dev --name init
    npx prisma generate
    ```

5.  **Seeding the database with test data**:

    -   Create a seed file with test data.
    -   Run the seed file using Prisma.

6.  **Configuring Row Level Security policies**:

    -   Enable RLS on the necessary tables.
    -   Create policies to restrict data access based on user roles and permissions.

7.  **Connecting to Supabase locally**:

    -   Use the Supabase CLI to connect to your local Supabase instance.

8.  **Database backup and restore for development**:

    -   Use the Supabase CLI to backup and restore the database.

### Backend Setup

1.  **Navigate to src/backend directory**:

    ```bash
    cd src/backend
    ```

2.  **Install dependencies with npm/yarn**:

    ```bash
    npm install # or yarn install
    ```

3.  **Run Prisma generate to generate client from schema**:

    ```bash
    npx prisma generate
    ```

4.  **Configure environment variables**:

    -   Ensure that all required environment variables are set in the `.env` file.

5.  **Start the development server**:

    ```bash
    npm run dev # or yarn dev
    ```

6.  **Verify API endpoints are working**:

    -   Test the API endpoints using a tool like Postman or curl.

7.  **Running backend tests**:

    ```bash
    npm test # or yarn test
    ```

8.  **Working with the backend in development mode**:

    -   Use hot reloading to quickly see changes in the browser.
    -   Use the debugger to step through code and inspect variables.

### Frontend Setup

1.  **Navigate to src/web directory**:

    ```bash
    cd src/web
    ```

2.  **Install dependencies with npm/yarn**:

    ```bash
    npm install # or yarn install
    ```

3.  **Configure environment variables**:

    -   Ensure that all required environment variables are set in the `.env` file.

4.  **Start the Next.js development server**:

    ```bash
    npm run dev # or yarn dev
    ```

5.  **Access the application at http://localhost:3000**:

    -   Open your browser and navigate to `http://localhost:3000`.

6.  **Working with server and client components**:

    -   Use server components for data fetching and rendering.
    -   Use client components for interactive elements and client-side state management.

7.  **Running frontend tests**:

    ```bash
    npm test # or yarn test
    ```

8.  **UI component development with Shadcn UI**:

    -   Use Shadcn UI components for consistent styling and accessibility.
    -   Customize the components as needed to match the Engagerr design system.

### AI Services Setup

1.  **Overview of the multi-model AI architecture**:

    -   The AI system uses a multi-model architecture with specialized models for different tasks.
    -   The AI Router directs requests to the appropriate model based on task requirements.

2.  **Prerequisites for AI model containers (NVIDIA Docker for GPU support)**:

    -   Install the NVIDIA Container Toolkit to enable GPU support for Docker containers.

3.  **Building and running AI containers with Docker Compose**:

    ```bash
    cd src/backend
    docker-compose -f docker-compose.ai.yml up --build
    ```

4.  **Configuring AI model endpoints**:

    -   Set the `LLAMA_SERVICE_URL` and `MISTRAL_SERVICE_URL` environment variables to the URLs of your local AI model containers.

5.  **Testing AI services locally**:

    -   Use a tool like Postman or curl to test the AI service endpoints.

6.  **Working with AI models in development**:

    -   Use hot reloading to quickly see changes in the AI model code.
    -   Use the debugger to step through code and inspect variables.

7.  **Using cloud API fallbacks for resource-intensive models**:

    -   Configure the AI Router to use cloud APIs like DeepSeek AI for resource-intensive models.

8.  **Troubleshooting AI service issues**:

    -   Check container logs for errors.
    -   Verify that the AI models are properly configured.

### External Services Integration

1.  **Stripe setup for payment processing (using test mode)**:

    -   Create a Stripe account and obtain test API keys.
    -   Configure the Stripe API keys in the `.env` files.
    -   Use Stripe's test mode to simulate payment processing.

2.  **Social platform API integration setup**:

    -   Create developer accounts on the social media platforms you want to integrate with.
    -   Obtain API keys and client IDs for each platform.
    -   Configure the API keys and client IDs in the `.env` files.

3.  **Email service configuration with Resend**:

    -   Create a Resend account and obtain an API key.
    -   Configure the Resend API key in the `.env` files.

4.  **Webhook configuration for local development**:

    -   Use a tool like ngrok to expose your local development server to the internet.
    -   Configure the webhook URLs in the social media platform developer dashboards.

5.  **Using ngrok or similar tools for webhook testing**:

    -   Start ngrok to create a secure tunnel to your local development server.
    -   Use the ngrok URL as the webhook URL in the social media platform developer dashboard.

6.  **Managing API keys securely**:

    -   Store API keys in environment variables.
    -   Use a secrets management tool to protect API keys in production.

7.  **Mocking external services for offline development**:

    -   Use mock implementations of the external services to develop and test the application offline.

### Development Workflow

1.  **Git branching strategy**:

    -   Use feature branches for developing new features.
    -   Use bugfix branches for fixing bugs.
    -   Use release branches for preparing releases.

2.  **Code formatting and linting**:

    -   Use Prettier for code formatting.
    -   Use ESLint for code linting.
    -   Configure Git hooks to automatically format and lint code before committing.

3.  **Type checking and TypeScript best practices**:

    -   Use TypeScript for type safety.
    -   Follow TypeScript best practices for code organization and maintainability.

4.  **Testing approach (unit, integration, e2e)**:

    -   Write unit tests for individual components and functions.
    -   Write integration tests for testing the interaction between different components.
    -   Write end-to-end tests for testing the entire application workflow.

5.  **Pull request process**:

    -   Create a pull request for each feature or bugfix.
    -   Get code review from other developers.
    -   Run tests to ensure code quality.
    -   Merge the pull request into the main branch.

6.  **Continuous Integration workflow**:

    -   Use a CI tool like GitHub Actions to automate the build, test, and deployment processes.

7.  **Using feature flags for development**:

    -   Use feature flags to enable or disable features in different environments.
    -   Use feature flags to gradually roll out new features to users.

8.  **Database migration handling**:

    -   Use Prisma Migrate to manage database schema changes.
    -   Follow a consistent migration workflow to ensure data integrity.

### Testing

1.  **Backend unit tests with Jest**:

    ```bash
    cd src/backend
    npm test # or yarn test
    ```

2.  **Frontend component testing with Testing Library**:

    ```bash
    cd src/web
    npm test # or yarn test
    ```

3.  **API endpoint testing**:

    -   Use a tool like Postman or curl to test the API endpoints.

4.  **End-to-end testing with Playwright**:

    -   Configure Playwright to run end-to-end tests against the local development environment.

5.  **Database testing approach**:

    -   Use a dedicated test database for testing.
    -   Seed the test database with test data.
    -   Use transactions to isolate tests and prevent data corruption.

6.  **CI test integration**:

    -   Configure the CI tool to run tests automatically on each commit.

7.  **Test data management**:

    -   Use a consistent approach for managing test data.
    -   Use a tool like Faker to generate realistic test data.

8.  **Manual testing procedures**:

    -   Perform manual testing to verify the functionality and usability of the application.

### Troubleshooting

1.  **Database connection issues**:

    -   Verify that the database server is running.
    -   Check the database connection string in the `.env` file.
    -   Ensure that the database user has the necessary permissions.

2.  **Environment configuration problems**:

    -   Verify that all required environment variables are set in the `.env` file.
    -   Check that the environment variables are correctly configured in the deployment environment.

3.  **AI container startup failures**:

    -   Check the container logs for errors.
    -   Verify that the AI models are properly configured.
    -   Ensure that the NVIDIA Container Toolkit is installed and configured correctly.

4.  **NextJS build and development server issues**:

    -   Check the console for error messages.
    -   Verify that all dependencies are installed.
    -   Try clearing the Next.js cache.

5.  **Authentication and permissions problems**:

    -   Verify that the authentication provider is properly configured.
    -   Check the user roles and permissions in the database.

6.  **External API integration troubleshooting**:

    -   Verify that the API keys and credentials are correct.
    -   Check network connectivity to the external service.
    -   Review the API documentation for error codes and troubleshooting tips.

7.  **Performance optimization tips**:

    -   Use server-side rendering for data-intensive pages.
    -   Use client-side caching to reduce network requests.
    -   Optimize database queries to improve performance.

8.  **Getting help and reporting issues**:

    -   Check the documentation for troubleshooting tips.
    -   Search for similar issues on Stack Overflow or other forums.
    -   Report issues to the Engagerr team on GitHub.