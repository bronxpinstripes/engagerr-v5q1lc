#!/bin/bash
#
# deploy-ai-models.sh - Deployment script for Engagerr AI Models
#
# This script builds and deploys the containerized AI models used in the
# Engagerr platform, including Llama 3 for content analysis, Mistral for
# classification, and the AI Router service.
#
# The script supports deployment to development, staging, and production
# environments with appropriate configurations for each.
#
# Usage: ./deploy-ai-models.sh [options]
#

# Set strict error handling
set -e

# Default global variables
ENV="dev"
DOCKER_REGISTRY="registry.engagerr.com"
TAG="latest"
MODEL_DIR="/opt/engagerr/models"
LOG_DIR="/var/log/engagerr"
LOG_FILE="${LOG_DIR}/ai-model-deployment-$(date +'%Y%m%d-%H%M%S').log"
MODELS="all"  # Default to all models
TIMEOUT=300   # Default timeout for health checks (5 minutes)
DRY_RUN=false
VERBOSE=false

# Function to log messages with timestamp
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    # Format the log message
    local formatted_message="[${timestamp}] [${level}] ${message}"
    
    # Print to stdout
    echo "${formatted_message}"
    
    # Append to log file if LOG_DIR exists
    if [ -d "${LOG_DIR}" ]; then
        echo "${formatted_message}" >> "${LOG_FILE}"
    fi
}

# Function to display usage information
print_usage() {
    cat << EOF
Usage: $(basename "$0") [options]

Deploy Engagerr AI Models to specified environment.

Options:
  -e, --env ENV           Target environment (dev, staging, prod) [default: dev]
  -r, --registry URL      Docker registry URL [default: registry.engagerr.com]
  -t, --tag VERSION       Version tag for Docker images [default: latest]
  -m, --models LIST       Comma-separated list of models to deploy (llama,mistral,router) [default: all]
  -d, --model-dir PATH    Directory containing model weights and configs [default: /opt/engagerr/models]
  -l, --log-dir PATH      Directory for deployment logs [default: /var/log/engagerr]
  -w, --timeout SECONDS   Timeout for health checks in seconds [default: 300]
  --dry-run               Print commands without executing them
  -v, --verbose           Enable verbose output
  -h, --help              Display this help message and exit

Examples:
  $(basename "$0") --env prod --tag v1.2.3                # Deploy all models to production with version v1.2.3
  $(basename "$0") --env staging --models llama,mistral   # Deploy only Llama and Mistral to staging
  $(basename "$0") --dry-run --verbose                   # Show what would be done without doing it

EOF
}

# Function to parse command-line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                ENV="$2"
                shift 2
                ;;
            -r|--registry)
                DOCKER_REGISTRY="$2"
                shift 2
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -m|--models)
                MODELS="$2"
                shift 2
                ;;
            -d|--model-dir)
                MODEL_DIR="$2"
                shift 2
                ;;
            -l|--log-dir)
                LOG_DIR="$2"
                shift 2
                ;;
            -w|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                log_message "ERROR" "Unknown option: $1"
                print_usage
                return 1
                ;;
        esac
    done

    # Validate environment
    if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
        log_message "ERROR" "Invalid environment: $ENV. Must be one of: dev, staging, prod"
        return 1
    fi

    # Create log directory if it doesn't exist
    if [ ! -d "${LOG_DIR}" ]; then
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would create log directory: ${LOG_DIR}"
        else
            mkdir -p "${LOG_DIR}"
            log_message "INFO" "Created log directory: ${LOG_DIR}"
        fi
    fi

    # Log the configuration
    log_message "INFO" "Deployment configuration:"
    log_message "INFO" "  Environment: ${ENV}"
    log_message "INFO" "  Docker Registry: ${DOCKER_REGISTRY}"
    log_message "INFO" "  Tag: ${TAG}"
    log_message "INFO" "  Models: ${MODELS}"
    log_message "INFO" "  Model Directory: ${MODEL_DIR}"
    log_message "INFO" "  Log Directory: ${LOG_DIR}"
    log_message "INFO" "  Timeout: ${TIMEOUT}s"
    log_message "INFO" "  Dry Run: ${DRY_RUN}"
    log_message "INFO" "  Verbose: ${VERBOSE}"

    return 0
}

# Function to check if all dependencies are installed
check_dependencies() {
    log_message "INFO" "Checking dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_message "ERROR" "Docker is not installed or not in PATH"
        return 1
    fi
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_message "ERROR" "Docker daemon is not running"
        return 1
    else
        log_message "INFO" "Docker is installed and running"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_message "ERROR" "Docker Compose is not installed or not in PATH"
        return 1
    else
        log_message "INFO" "Docker Compose is installed"
    fi
    
    # Check if MODEL_DIR exists
    if [ ! -d "${MODEL_DIR}" ]; then
        log_message "WARNING" "Model directory ${MODEL_DIR} does not exist"
        if [ "${MODELS}" != "router" ]; then
            log_message "ERROR" "Model directory is required for deploying Llama and Mistral models"
            return 1
        fi
    else
        log_message "INFO" "Model directory exists: ${MODEL_DIR}"
    fi
    
    return 0
}

# Function to build Docker images
build_images() {
    local models_to_build=$1
    local build_success=true
    
    log_message "INFO" "Building Docker images..."
    
    # Determine which models to build
    local build_llama=false
    local build_mistral=false
    local build_router=false
    
    if [ "${models_to_build}" == "all" ]; then
        build_llama=true
        build_mistral=true
        build_router=true
    else
        # Parse comma-separated list
        IFS=',' read -ra MODEL_ARRAY <<< "${models_to_build}"
        for model in "${MODEL_ARRAY[@]}"; do
            case "${model}" in
                llama)
                    build_llama=true
                    ;;
                mistral)
                    build_mistral=true
                    ;;
                router)
                    build_router=true
                    ;;
                *)
                    log_message "WARNING" "Unknown model: ${model}"
                    ;;
            esac
        done
    fi
    
    # Build Llama 3 image if requested
    if ${build_llama}; then
        log_message "INFO" "Building Llama 3 model image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker build -t ${DOCKER_REGISTRY}/engagerr-llama:${TAG} -f src/backend/Dockerfile.llama ."
        else
            if ${VERBOSE}; then
                docker build -t "${DOCKER_REGISTRY}/engagerr-llama:${TAG}" \
                    --build-arg MODEL_DIR="${MODEL_DIR}" \
                    -f src/backend/Dockerfile.llama .
            else
                docker build -t "${DOCKER_REGISTRY}/engagerr-llama:${TAG}" \
                    --build-arg MODEL_DIR="${MODEL_DIR}" \
                    -f src/backend/Dockerfile.llama . > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully built Llama 3 image"
            else
                log_message "ERROR" "Failed to build Llama 3 image"
                build_success=false
            fi
        fi
    fi
    
    # Build Mistral image if requested
    if ${build_mistral}; then
        log_message "INFO" "Building Mistral model image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker build -t ${DOCKER_REGISTRY}/engagerr-mistral:${TAG} -f src/backend/Dockerfile.mistral ."
        else
            if ${VERBOSE}; then
                docker build -t "${DOCKER_REGISTRY}/engagerr-mistral:${TAG}" \
                    --build-arg MODEL_DIR="${MODEL_DIR}" \
                    -f src/backend/Dockerfile.mistral .
            else
                docker build -t "${DOCKER_REGISTRY}/engagerr-mistral:${TAG}" \
                    --build-arg MODEL_DIR="${MODEL_DIR}" \
                    -f src/backend/Dockerfile.mistral . > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully built Mistral image"
            else
                log_message "ERROR" "Failed to build Mistral image"
                build_success=false
            fi
        fi
    fi
    
    # Build AI Router image if requested
    if ${build_router}; then
        log_message "INFO" "Building AI Router image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker build -t ${DOCKER_REGISTRY}/engagerr-ai-router:${TAG} -f infrastructure/docker/ai-router/Dockerfile ."
        else
            if ${VERBOSE}; then
                docker build -t "${DOCKER_REGISTRY}/engagerr-ai-router:${TAG}" \
                    -f infrastructure/docker/ai-router/Dockerfile .
            else
                docker build -t "${DOCKER_REGISTRY}/engagerr-ai-router:${TAG}" \
                    -f infrastructure/docker/ai-router/Dockerfile . > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully built AI Router image"
            else
                log_message "ERROR" "Failed to build AI Router image"
                build_success=false
            fi
        fi
    fi
    
    if ${build_success}; then
        log_message "INFO" "All requested images built successfully"
        return 0
    else
        log_message "ERROR" "One or more images failed to build"
        return 1
    fi
}

# Function to push images to Docker registry
push_images() {
    local models_to_push=$1
    local push_success=true
    
    log_message "INFO" "Pushing Docker images to registry ${DOCKER_REGISTRY}..."
    
    # Determine which models to push
    local push_llama=false
    local push_mistral=false
    local push_router=false
    
    if [ "${models_to_push}" == "all" ]; then
        push_llama=true
        push_mistral=true
        push_router=true
    else
        # Parse comma-separated list
        IFS=',' read -ra MODEL_ARRAY <<< "${models_to_push}"
        for model in "${MODEL_ARRAY[@]}"; do
            case "${model}" in
                llama)
                    push_llama=true
                    ;;
                mistral)
                    push_mistral=true
                    ;;
                router)
                    push_router=true
                    ;;
                *)
                    log_message "WARNING" "Unknown model: ${model}"
                    ;;
            esac
        done
    fi
    
    # Login to Docker registry if not in dry-run mode
    if ! ${DRY_RUN}; then
        # Check if we need to login to the registry
        if [[ "${DOCKER_REGISTRY}" != "localhost"* ]] && [[ "${DOCKER_REGISTRY}" != "127.0.0.1"* ]]; then
            log_message "INFO" "Logging in to Docker registry..."
            # This assumes docker login credentials are stored in ~/.docker/config.json
            # or provided via environment variables
            if ! docker login "${DOCKER_REGISTRY}" > /dev/null; then
                log_message "ERROR" "Failed to login to Docker registry ${DOCKER_REGISTRY}"
                return 1
            fi
        fi
    fi
    
    # Push Llama 3 image if requested
    if ${push_llama}; then
        log_message "INFO" "Pushing Llama 3 model image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker push ${DOCKER_REGISTRY}/engagerr-llama:${TAG}"
        else
            if ${VERBOSE}; then
                docker push "${DOCKER_REGISTRY}/engagerr-llama:${TAG}"
            else
                docker push "${DOCKER_REGISTRY}/engagerr-llama:${TAG}" > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully pushed Llama 3 image"
            else
                log_message "ERROR" "Failed to push Llama 3 image"
                push_success=false
            fi
        fi
    fi
    
    # Push Mistral image if requested
    if ${push_mistral}; then
        log_message "INFO" "Pushing Mistral model image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker push ${DOCKER_REGISTRY}/engagerr-mistral:${TAG}"
        else
            if ${VERBOSE}; then
                docker push "${DOCKER_REGISTRY}/engagerr-mistral:${TAG}"
            else
                docker push "${DOCKER_REGISTRY}/engagerr-mistral:${TAG}" > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully pushed Mistral image"
            else
                log_message "ERROR" "Failed to push Mistral image"
                push_success=false
            fi
        fi
    fi
    
    # Push AI Router image if requested
    if ${push_router}; then
        log_message "INFO" "Pushing AI Router image..."
        if ${DRY_RUN}; then
            log_message "DRY-RUN" "Would run: docker push ${DOCKER_REGISTRY}/engagerr-ai-router:${TAG}"
        else
            if ${VERBOSE}; then
                docker push "${DOCKER_REGISTRY}/engagerr-ai-router:${TAG}"
            else
                docker push "${DOCKER_REGISTRY}/engagerr-ai-router:${TAG}" > /dev/null
            fi
            
            if [ $? -eq 0 ]; then
                log_message "INFO" "Successfully pushed AI Router image"
            else
                log_message "ERROR" "Failed to push AI Router image"
                push_success=false
            fi
        fi
    fi
    
    if ${push_success}; then
        log_message "INFO" "All requested images pushed successfully"
        return 0
    else
        log_message "ERROR" "One or more images failed to push"
        return 1
    fi
}

# Function to deploy AI models
deploy_models() {
    local models_to_deploy=$1
    local target_env=$2
    local deploy_success=true
    
    log_message "INFO" "Deploying AI models to ${target_env} environment..."
    
    # Determine which models to deploy
    local deploy_llama=false
    local deploy_mistral=false
    local deploy_router=false
    
    if [ "${models_to_deploy}" == "all" ]; then
        deploy_llama=true
        deploy_mistral=true
        deploy_router=true
    else
        # Parse comma-separated list
        IFS=',' read -ra MODEL_ARRAY <<< "${models_to_deploy}"
        for model in "${MODEL_ARRAY[@]}"; do
            case "${model}" in
                llama)
                    deploy_llama=true
                    ;;
                mistral)
                    deploy_mistral=true
                    ;;
                router)
                    deploy_router=true
                    ;;
                *)
                    log_message "WARNING" "Unknown model: ${model}"
                    ;;
            esac
        done
    fi
    
    # Select the appropriate docker-compose file
    local compose_file="infrastructure/docker/docker-compose.${target_env}.yml"
    
    if [ ! -f "${compose_file}" ]; then
        log_message "ERROR" "Docker Compose file not found: ${compose_file}"
        return 1
    fi
    
    # Generate environment-specific .env file
    local env_file="infrastructure/docker/.env.${target_env}"
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would create environment file: ${env_file}"
    else
        log_message "INFO" "Generating environment file: ${env_file}"
        cat > "${env_file}" << EOF
# Engagerr AI Models Environment Configuration
# Generated by deploy-ai-models.sh on $(date)
# Environment: ${target_env}

# Docker registry and image tags
DOCKER_REGISTRY=${DOCKER_REGISTRY}
IMAGE_TAG=${TAG}

# Service configuration
AI_ROUTER_PORT=8080
LLAMA_MODEL_PORT=8081
MISTRAL_MODEL_PORT=8082

# Resource limits
LLAMA_MEMORY_LIMIT=16g
LLAMA_CPU_LIMIT=4
MISTRAL_MEMORY_LIMIT=8g
MISTRAL_CPU_LIMIT=2
ROUTER_MEMORY_LIMIT=2g
ROUTER_CPU_LIMIT=1

# Model configuration
MODEL_VOLUME_PATH=${MODEL_DIR}
LOG_VOLUME_PATH=${LOG_DIR}

# Health check settings
HEALTH_CHECK_INTERVAL=30s
HEALTH_CHECK_TIMEOUT=10s
HEALTH_CHECK_RETRIES=5

# Environment-specific settings
EOF

        # Add environment-specific settings
        case "${target_env}" in
            dev)
                cat >> "${env_file}" << EOF
DEBUG=true
API_RATE_LIMIT=100
ENABLE_TRACING=true
EOF
                ;;
            staging)
                cat >> "${env_file}" << EOF
DEBUG=false
API_RATE_LIMIT=200
ENABLE_TRACING=true
EOF
                ;;
            prod)
                cat >> "${env_file}" << EOF
DEBUG=false
API_RATE_LIMIT=500
ENABLE_TRACING=false
EOF
                ;;
        esac
        
        log_message "INFO" "Environment file generated: ${env_file}"
    fi
    
    # Stop any running containers
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would stop existing containers: docker-compose -f ${compose_file} --env-file ${env_file} down"
    else
        log_message "INFO" "Stopping existing containers..."
        if ${VERBOSE}; then
            docker-compose -f "${compose_file}" --env-file "${env_file}" down
        else
            docker-compose -f "${compose_file}" --env-file "${env_file}" down > /dev/null
        fi
    fi
    
    # Pull latest images (if not building locally)
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would pull latest images: docker-compose -f ${compose_file} --env-file ${env_file} pull"
    else
        log_message "INFO" "Pulling latest images..."
        if ${VERBOSE}; then
            docker-compose -f "${compose_file}" --env-file "${env_file}" pull
        else
            docker-compose -f "${compose_file}" --env-file "${env_file}" pull > /dev/null
        fi
    fi
    
    # Start containers based on which models to deploy
    local services=""
    if ${deploy_router}; then
        services+=" ai-router"
    fi
    if ${deploy_llama}; then
        services+=" llama-model"
    fi
    if ${deploy_mistral}; then
        services+=" mistral-model"
    fi
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would start containers: docker-compose -f ${compose_file} --env-file ${env_file} up -d${services}"
    else
        log_message "INFO" "Starting containers: ${services}"
        if ${VERBOSE}; then
            docker-compose -f "${compose_file}" --env-file "${env_file}" up -d ${services}
        else
            docker-compose -f "${compose_file}" --env-file "${env_file}" up -d ${services} > /dev/null
        fi
        
        if [ $? -eq 0 ]; then
            log_message "INFO" "Containers started successfully"
        else
            log_message "ERROR" "Failed to start containers"
            deploy_success=false
        fi
    fi
    
    if ${deploy_success}; then
        log_message "INFO" "Deployment to ${target_env} completed successfully"
        return 0
    else
        log_message "ERROR" "Deployment to ${target_env} failed"
        return 1
    fi
}

# Function to set up load balancer
setup_loadbalancer() {
    local target_env=$1
    local lb_success=true
    
    log_message "INFO" "Setting up load balancer for ${target_env} environment..."
    
    # Traefik configuration file
    local traefik_file="infrastructure/docker/traefik/traefik.${target_env}.toml"
    
    if [ ! -f "${traefik_file}" ]; then
        log_message "ERROR" "Traefik configuration file not found: ${traefik_file}"
        return 1
    fi
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would configure load balancer using: ${traefik_file}"
    else
        # Create Traefik configuration directory if it doesn't exist
        local traefik_dir="infrastructure/docker/traefik/config"
        if [ ! -d "${traefik_dir}" ]; then
            mkdir -p "${traefik_dir}"
        fi
        
        # Copy configuration file to the right location
        cp "${traefik_file}" "${traefik_dir}/traefik.toml"
        
        # Start or restart Traefik
        log_message "INFO" "Starting Traefik load balancer..."
        
        if ${VERBOSE}; then
            docker-compose -f infrastructure/docker/traefik/docker-compose.yml up -d
        else
            docker-compose -f infrastructure/docker/traefik/docker-compose.yml up -d > /dev/null
        fi
        
        if [ $? -eq 0 ]; then
            log_message "INFO" "Traefik load balancer started successfully"
        else
            log_message "ERROR" "Failed to start Traefik load balancer"
            lb_success=false
        fi
    fi
    
    if ${lb_success}; then
        log_message "INFO" "Load balancer setup completed successfully"
        return 0
    else
        log_message "ERROR" "Load balancer setup failed"
        return 1
    fi
}

# Function to monitor deployment health
monitor_deployment() {
    local models_to_monitor=$1
    local max_wait_time=$2
    local monitor_success=true
    
    log_message "INFO" "Monitoring deployment health (timeout: ${max_wait_time}s)..."
    
    # Determine which models to monitor
    local monitor_llama=false
    local monitor_mistral=false
    local monitor_router=false
    
    if [ "${models_to_monitor}" == "all" ]; then
        monitor_llama=true
        monitor_mistral=true
        monitor_router=true
    else
        # Parse comma-separated list
        IFS=',' read -ra MODEL_ARRAY <<< "${models_to_monitor}"
        for model in "${MODEL_ARRAY[@]}"; do
            case "${model}" in
                llama)
                    monitor_llama=true
                    ;;
                mistral)
                    monitor_mistral=true
                    ;;
                router)
                    monitor_router=true
                    ;;
                *)
                    log_message "WARNING" "Unknown model: ${model}"
                    ;;
            esac
        done
    fi
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would monitor health of deployed services"
        return 0
    fi
    
    # Wait for services to be healthy
    local start_time=$(date +%s)
    local current_time=$(date +%s)
    local elapsed_time=0
    
    while [ ${elapsed_time} -lt ${max_wait_time} ]; do
        local all_healthy=true
        
        # Check AI Router health
        if ${monitor_router}; then
            local router_status=$(docker ps --filter "name=ai-router" --format "{{.Status}}" | grep -c "healthy" || echo "0")
            if [ "${router_status}" -eq "0" ]; then
                all_healthy=false
                log_message "INFO" "AI Router is not healthy yet..."
            else
                log_message "INFO" "AI Router is healthy"
            fi
        fi
        
        # Check Llama model health
        if ${monitor_llama}; then
            local llama_status=$(docker ps --filter "name=llama-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
            if [ "${llama_status}" -eq "0" ]; then
                all_healthy=false
                log_message "INFO" "Llama model is not healthy yet..."
            else
                log_message "INFO" "Llama model is healthy"
            fi
        fi
        
        # Check Mistral model health
        if ${monitor_mistral}; then
            local mistral_status=$(docker ps --filter "name=mistral-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
            if [ "${mistral_status}" -eq "0" ]; then
                all_healthy=false
                log_message "INFO" "Mistral model is not healthy yet..."
            else
                log_message "INFO" "Mistral model is healthy"
            fi
        fi
        
        # If all required services are healthy, we're done
        if ${all_healthy}; then
            log_message "INFO" "All services are healthy!"
            return 0
        fi
        
        # Sleep for a bit before checking again
        sleep 10
        
        # Update elapsed time
        current_time=$(date +%s)
        elapsed_time=$((current_time - start_time))
        
        log_message "INFO" "Waiting for services to be healthy... (${elapsed_time}/${max_wait_time}s)"
    done
    
    # If we get here, the timeout was reached
    log_message "ERROR" "Timeout reached waiting for services to be healthy"
    
    # Check which services are still unhealthy
    if ${monitor_router}; then
        local router_status=$(docker ps --filter "name=ai-router" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        if [ "${router_status}" -eq "0" ]; then
            log_message "ERROR" "AI Router is still unhealthy after timeout"
            if ${VERBOSE}; then
                log_message "DEBUG" "AI Router logs:"
                docker logs ai-router --tail 50
            fi
            monitor_success=false
        fi
    fi
    
    if ${monitor_llama}; then
        local llama_status=$(docker ps --filter "name=llama-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        if [ "${llama_status}" -eq "0" ]; then
            log_message "ERROR" "Llama model is still unhealthy after timeout"
            if ${VERBOSE}; then
                log_message "DEBUG" "Llama model logs:"
                docker logs llama-model --tail 50
            fi
            monitor_success=false
        fi
    fi
    
    if ${monitor_mistral}; then
        local mistral_status=$(docker ps --filter "name=mistral-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        if [ "${mistral_status}" -eq "0" ]; then
            log_message "ERROR" "Mistral model is still unhealthy after timeout"
            if ${VERBOSE}; then
                log_message "DEBUG" "Mistral model logs:"
                docker logs mistral-model --tail 50
            fi
            monitor_success=false
        fi
    fi
    
    if ${monitor_success}; then
        return 0
    else
        return 1
    fi
}

# Function to roll back deployment
rollback_deployment() {
    local target_env=$1
    local rollback_success=true
    
    log_message "INFO" "Rolling back deployment in ${target_env} environment..."
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would roll back to previous deployment"
        return 0
    fi
    
    # Stop current deployment
    log_message "INFO" "Stopping current deployment..."
    
    # Select the appropriate docker-compose file
    local compose_file="infrastructure/docker/docker-compose.${target_env}.yml"
    local env_file="infrastructure/docker/.env.${target_env}"
    
    if [ ! -f "${compose_file}" ]; then
        log_message "ERROR" "Docker Compose file not found: ${compose_file}"
        return 1
    fi
    
    if [ ! -f "${env_file}" ]; then
        log_message "ERROR" "Environment file not found: ${env_file}"
        return 1
    fi
    
    # Stop the current deployment
    if ${VERBOSE}; then
        docker-compose -f "${compose_file}" --env-file "${env_file}" down
    else
        docker-compose -f "${compose_file}" --env-file "${env_file}" down > /dev/null
    fi
    
    # Check for previous deployment backup
    local backup_tag_file="${LOG_DIR}/previous_tag.${target_env}"
    if [ ! -f "${backup_tag_file}" ]; then
        log_message "ERROR" "Previous deployment information not found, cannot roll back"
        return 1
    fi
    
    # Read previous tag
    local previous_tag=$(cat "${backup_tag_file}")
    log_message "INFO" "Rolling back to previous version: ${previous_tag}"
    
    # Create a temporary .env file with the previous tag
    local rollback_env_file="${env_file}.rollback"
    cp "${env_file}" "${rollback_env_file}"
    sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=${previous_tag}/" "${rollback_env_file}"
    
    # Start with previous version
    log_message "INFO" "Starting previous version..."
    if ${VERBOSE}; then
        docker-compose -f "${compose_file}" --env-file "${rollback_env_file}" up -d
    else
        docker-compose -f "${compose_file}" --env-file "${rollback_env_file}" up -d > /dev/null
    fi
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "Previous version started successfully"
        
        # Wait for services to be healthy
        log_message "INFO" "Waiting for services to be healthy..."
        sleep 30
        
        # Check health
        local all_healthy=true
        local router_status=$(docker ps --filter "name=ai-router" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        local llama_status=$(docker ps --filter "name=llama-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        local mistral_status=$(docker ps --filter "name=mistral-model" --format "{{.Status}}" | grep -c "healthy" || echo "0")
        
        if [ "${router_status}" -eq "0" ] || [ "${llama_status}" -eq "0" ] || [ "${mistral_status}" -eq "0" ]; then
            all_healthy=false
        fi
        
        if ${all_healthy}; then
            log_message "INFO" "Rollback successful, services are healthy"
        else
            log_message "WARNING" "Rollback completed but some services may not be healthy"
            rollback_success=false
        fi
        
        # Clean up the temporary file
        rm "${rollback_env_file}"
    else
        log_message "ERROR" "Failed to start previous version"
        rollback_success=false
    fi
    
    if ${rollback_success}; then
        log_message "INFO" "Rollback completed successfully"
        return 0
    else
        log_message "ERROR" "Rollback failed or partially succeeded"
        return 1
    fi
}

# Function to perform cleanup
cleanup() {
    log_message "INFO" "Performing cleanup operations..."
    
    if ${DRY_RUN}; then
        log_message "DRY-RUN" "Would clean up unused Docker images and temporary files"
        return
    fi
    
    # Save current version for potential rollback
    log_message "INFO" "Saving current version for potential rollback..."
    if [ ! -d "${LOG_DIR}" ]; then
        mkdir -p "${LOG_DIR}"
    fi
    echo "${TAG}" > "${LOG_DIR}/previous_tag.${ENV}"
    
    # Remove unused Docker images to free space
    log_message "INFO" "Cleaning up unused Docker images..."
    docker image prune -f > /dev/null
    
    # Archive logs if needed
    if [ ${VERBOSE} ]; then
        log_message "INFO" "Logs have been saved to ${LOG_FILE}"
    fi
    
    log_message "INFO" "Cleanup completed"
}

# Main execution
main() {
    log_message "INFO" "Starting Engagerr AI Models deployment..."
    
    # Parse command-line arguments
    parse_arguments "$@"
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Check dependencies
    check_dependencies
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Dependency check failed, aborting deployment"
        return 1
    fi
    
    # Build Docker images
    build_images "${MODELS}"
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Image build failed, aborting deployment"
        return 1
    fi
    
    # Push images to registry
    push_images "${MODELS}"
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Image push failed, aborting deployment"
        return 1
    fi
    
    # Deploy models
    deploy_models "${MODELS}" "${ENV}"
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Deployment failed"
        log_message "INFO" "Attempting to roll back to previous version..."
        rollback_deployment "${ENV}"
        return 1
    fi
    
    # Set up load balancer
    setup_loadbalancer "${ENV}"
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Load balancer setup failed"
        log_message "INFO" "Deployment will continue but may have limited functionality"
    fi
    
    # Monitor deployment
    monitor_deployment "${MODELS}" "${TIMEOUT}"
    if [ $? -ne 0 ]; then
        log_message "ERROR" "Deployment health check failed"
        log_message "INFO" "Attempting to roll back to previous version..."
        rollback_deployment "${ENV}"
        return 1
    fi
    
    # Perform cleanup
    cleanup
    
    log_message "INFO" "Deployment completed successfully!"
    return 0
}

# Run main function with all arguments
main "$@"
exit $?