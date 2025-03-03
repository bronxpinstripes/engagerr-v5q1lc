# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built application from build stage
COPY --from=build /app/dist /app/dist

# Expose the API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    MODEL_LLAMA_URL=http://llama:8080 \
    MODEL_MISTRAL_URL=http://mistral:8080 \
    DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY} \
    HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY} \
    CACHE_ENABLED=true \
    CACHE_TTL=3600 \
    LOG_LEVEL=info \
    REQUEST_TIMEOUT=30000 \
    FALLBACK_ENABLED=true

# Healthcheck to verify the service is running correctly
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run as non-root user for security
USER node

# Command to run the application
CMD ["node", "dist/services/ai/router.js"]