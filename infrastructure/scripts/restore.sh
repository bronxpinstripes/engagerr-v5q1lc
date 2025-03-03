#!/usr/bin/env bash
#
# restore.sh - Restoration script for Engagerr system backups
#
# This script restores Engagerr system backups including database, file storage,
# AI models, and configurations to recover from failures or migrate environments.
#
# It supports full backups, incremental backups, and point-in-time recovery options.

# Exit on error, pipefail for pipe errors
set -eo pipefail
# Uncomment for debugging
# set -x

# Define script directory and global variables
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")
LOG_FILE="${SCRIPT_DIR}/../logs/restore_$(date +%Y%m%d_%H%M%S).log"
CONFIG_FILE="${SCRIPT_DIR}/../.env"
BACKUP_TYPES=("full" "incremental" "point-in-time")
BACKUP_STORAGE_PATH="${BACKUP_STORAGE:-s3://engagerr-backups}"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Log a message to both stdout and log file
# Args:
#   $1: message - The message to log
#   $2: level - Log level (INFO, WARN, ERROR, DEBUG)
log_message() {
    local message="$1"
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local formatted_message="[$timestamp] [$level] $message"
    
    # Output to stdout
    echo "$formatted_message"
    
    # Append to log file
    echo "$formatted_message" >> "$LOG_FILE"
}

# Load environment variables from config file
# Returns:
#   0 for success, 1 for failure
load_env() {
    if [[ -f "$CONFIG_FILE" ]]; then
        log_message "Loading environment variables from $CONFIG_FILE" "INFO"
        source "$CONFIG_FILE"
        
        # Check required environment variables
        local required_vars=("SUPABASE_URL" "SUPABASE_SERVICE_KEY" "DATABASE_URL")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var}" ]]; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_message "Missing required environment variables: ${missing_vars[*]}" "ERROR"
            return 1
        fi
        
        # Set defaults for optional variables
        export ENVIRONMENT=${ENVIRONMENT:-development}
        export BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
        
        log_message "Environment variables loaded successfully" "INFO"
        return 0
    else
        log_message "Config file not found: $CONFIG_FILE" "ERROR"
        return 1
    fi
}

# Check if required dependencies are installed
# Returns:
#   0 if all dependencies are available, 1 otherwise
check_dependencies() {
    local missing_deps=()
    local required_commands=("pg_restore" "aws" "supabase" "jq" "curl" "tar" "gzip")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_message "Missing required dependencies: ${missing_deps[*]}" "ERROR"
        log_message "Please install the missing dependencies and try again." "ERROR"
        return 1
    fi
    
    log_message "All required dependencies are available" "INFO"
    return 0
}

# List available backups of the specified type
# Args:
#   $1: backup_type - Type of backup to list (full, incremental, point-in-time)
# Returns:
#   Array of available backups
list_available_backups() {
    local backup_type="$1"
    local backups=()
    local s3_path
    
    # Validate backup type
    if [[ ! " ${BACKUP_TYPES[*]} " =~ " ${backup_type} " ]]; then
        log_message "Invalid backup type: $backup_type. Valid types are: ${BACKUP_TYPES[*]}" "ERROR"
        return 1
    fi
    
    # Determine S3 path based on environment and backup type
    s3_path="${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/${backup_type}"
    
    log_message "Listing available $backup_type backups from $s3_path" "INFO"
    
    # List backups from S3
    if ! aws_output=$(aws s3 ls "$s3_path/" --recursive 2>&1); then
        log_message "Failed to list backups: $aws_output" "ERROR"
        return 1
    fi
    
    # Parse output and extract backup files
    while read -r line; do
        # Extract date and filename
        date_part=$(echo "$line" | awk '{print $1 " " $2}')
        file_part=$(echo "$line" | awk '{print $4}')
        
        if [[ "$file_part" == *".backup"* || "$file_part" == *".sql"* || "$file_part" == *".tar.gz"* ]]; then
            backup_name=$(basename "$file_part")
            backups+=("$backup_name ($date_part)")
        fi
    done <<< "$aws_output"
    
    # Display available backups
    if [[ ${#backups[@]} -eq 0 ]]; then
        log_message "No $backup_type backups found" "WARN"
    else
        log_message "Available $backup_type backups:" "INFO"
        for i in "${!backups[@]}"; do
            log_message "  $((i+1)). ${backups[$i]}" "INFO"
        done
    fi
    
    echo "${backups[@]}"
}

# Restore PostgreSQL database from backup
# Args:
#   $1: backup_file - Path or name of the backup file
#   $2: backup_type - Type of backup (full, incremental, point-in-time)
# Returns:
#   0 for success, non-zero for failure
restore_database() {
    local backup_file="$1"
    local backup_type="$2"
    local temp_dir
    local s3_backup_path
    local db_host db_port db_user db_name db_password
    local status=0
    
    log_message "Starting database restoration from $backup_type backup: $backup_file" "INFO"
    
    # Create temporary directory for restoration
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT
    
    # Extract database connection parameters from DATABASE_URL
    if [[ -n "$DATABASE_URL" ]]; then
        db_user=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        db_password=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
        db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    else
        log_message "DATABASE_URL not set, using environment variables" "WARN"
        db_host="${DB_HOST:-localhost}"
        db_port="${DB_PORT:-5432}"
        db_user="${DB_USER:-postgres}"
        db_password="${DB_PASSWORD:-postgres}"
        db_name="${DB_NAME:-engagerr}"
    fi
    
    # Check if backup file is on S3 or local
    if [[ "$backup_file" != /* && "$backup_file" != ./* ]]; then
        # Assume it's on S3
        s3_backup_path="${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/${backup_type}/${backup_file}"
        log_message "Downloading backup from $s3_backup_path" "INFO"
        
        if ! aws s3 cp "$s3_backup_path" "${temp_dir}/${backup_file}" 2>&1; then
            log_message "Failed to download backup file from S3" "ERROR"
            return 1
        fi
        
        backup_file="${temp_dir}/${backup_file}"
    fi
    
    # Validate backup file exists and is readable
    if [[ ! -f "$backup_file" ]]; then
        log_message "Backup file not found: $backup_file" "ERROR"
        return 1
    fi
    
    # Export environment variables for psql/pg_restore
    export PGHOST="$db_host"
    export PGPORT="$db_port"
    export PGUSER="$db_user"
    export PGPASSWORD="$db_password"
    export PGDATABASE="$db_name"
    
    # Perform restoration based on backup type
    case "$backup_type" in
        "full")
            log_message "Performing full database restoration" "INFO"
            
            # Drop existing connections
            if ! psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid();" postgres; then
                log_message "Failed to terminate existing database connections" "WARN"
            fi
            
            # Determine file format and restore accordingly
            if [[ "$backup_file" == *.sql ]]; then
                # SQL dump format
                log_message "Restoring from SQL dump" "INFO"
                if ! psql -f "$backup_file" 2>&1; then
                    log_message "Failed to restore database from SQL dump" "ERROR"
                    status=1
                fi
            else
                # Custom/directory format
                log_message "Restoring from pg_dump custom format" "INFO"
                if ! pg_restore --clean --if-exists --no-owner --no-privileges -d "$db_name" "$backup_file" 2>&1; then
                    log_message "Failed to restore database from custom format backup" "ERROR"
                    status=1
                fi
            fi
            ;;
            
        "incremental")
            log_message "Applying incremental backup" "INFO"
            # Incremental backups are usually WAL files or SQL patches
            if [[ "$backup_file" == *.sql ]]; then
                if ! psql -f "$backup_file" 2>&1; then
                    log_message "Failed to apply incremental backup" "ERROR"
                    status=1
                fi
            else
                log_message "Unsupported incremental backup format" "ERROR"
                status=1
            fi
            ;;
            
        "point-in-time")
            log_message "Performing point-in-time recovery" "INFO"
            # Extract recovery timestamp from backup file name
            local timestamp
            timestamp=$(basename "$backup_file" | grep -oP '\d{8}_\d{6}' | sed 's/_/ /')
            
            if [[ -z "$timestamp" ]]; then
                log_message "Could not determine recovery timestamp from backup file" "ERROR"
                status=1
            else
                if ! point_in_time_recovery "$timestamp"; then
                    log_message "Failed to perform point-in-time recovery" "ERROR"
                    status=1
                fi
            fi
            ;;
            
        *)
            log_message "Unsupported backup type: $backup_type" "ERROR"
            status=1
            ;;
    esac
    
    # Verify restoration success
    if [[ $status -eq 0 ]]; then
        log_message "Verifying database restoration" "INFO"
        if ! psql -c "SELECT 1 AS test_value;" > /dev/null 2>&1; then
            log_message "Database verification failed" "ERROR"
            status=1
        else
            log_message "Database restored successfully" "INFO"
        fi
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
    
    return $status
}

# Restore Supabase storage (file uploads) from backup
# Args:
#   $1: backup_file - Path or name of the storage backup file
# Returns:
#   0 for success, non-zero for failure
restore_storage() {
    local backup_file="$1"
    local temp_dir
    local s3_backup_path
    local status=0
    
    log_message "Starting storage restoration from backup: $backup_file" "INFO"
    
    # Create temporary directory for restoration
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT
    
    # Check if backup file is on S3 or local
    if [[ "$backup_file" != /* && "$backup_file" != ./* ]]; then
        # Assume it's on S3
        s3_backup_path="${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/storage/${backup_file}"
        log_message "Downloading storage backup from $s3_backup_path" "INFO"
        
        if ! aws s3 cp "$s3_backup_path" "${temp_dir}/${backup_file}" 2>&1; then
            log_message "Failed to download storage backup file from S3" "ERROR"
            return 1
        fi
        
        backup_file="${temp_dir}/${backup_file}"
    fi
    
    # Validate backup file exists and is readable
    if [[ ! -f "$backup_file" ]]; then
        log_message "Storage backup file not found: $backup_file" "ERROR"
        return 1
    fi
    
    # Extract backup
    log_message "Extracting storage backup" "INFO"
    mkdir -p "${temp_dir}/storage"
    if ! tar -xzf "$backup_file" -C "${temp_dir}/storage" 2>&1; then
        log_message "Failed to extract storage backup" "ERROR"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Check if we should use Supabase CLI or direct API calls
    if command -v supabase &> /dev/null && [[ -n "$SUPABASE_PROJECT_ID" ]]; then
        log_message "Using Supabase CLI for storage restoration" "INFO"
        
        # Verify Supabase login
        if ! supabase projects list > /dev/null 2>&1; then
            log_message "Not logged in to Supabase CLI. Attempting login..." "WARN"
            if ! supabase login; then
                log_message "Failed to login to Supabase CLI" "ERROR"
                status=1
            fi
        fi
        
        if [[ $status -eq 0 ]]; then
            # Get list of existing buckets
            local buckets
            buckets=$(supabase storage list buckets --project-ref "$SUPABASE_PROJECT_ID" -j | jq -r '.[].name')
            
            # Process each directory in the backup (representing a bucket)
            for bucket_dir in "${temp_dir}/storage"/*; do
                if [[ -d "$bucket_dir" ]]; then
                    bucket_name=$(basename "$bucket_dir")
                    
                    # Check if bucket exists, create if it doesn't
                    if [[ ! "$buckets" == *"$bucket_name"* ]]; then
                        log_message "Creating bucket: $bucket_name" "INFO"
                        if ! supabase storage create bucket "$bucket_name" --project-ref "$SUPABASE_PROJECT_ID"; then
                            log_message "Failed to create bucket: $bucket_name" "ERROR"
                            status=1
                            continue
                        fi
                    fi
                    
                    # Upload files to bucket
                    log_message "Uploading files to bucket: $bucket_name" "INFO"
                    find "$bucket_dir" -type f | while read -r file; do
                        relative_path=${file#"$bucket_dir/"}
                        
                        # Create directory if needed
                        if [[ "$relative_path" == */* ]]; then
                            directory=$(dirname "$relative_path")
                            supabase storage create path "$bucket_name" "$directory" --project-ref "$SUPABASE_PROJECT_ID" || true
                        fi
                        
                        # Upload file
                        if ! supabase storage upload "$bucket_name" "$file" "$relative_path" --project-ref "$SUPABASE_PROJECT_ID"; then
                            log_message "Failed to upload file: $relative_path to bucket: $bucket_name" "ERROR"
                            status=1
                        fi
                    done
                fi
            done
        fi
    else
        # Use direct API calls
        log_message "Using direct API calls for storage restoration" "INFO"
        
        if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_KEY" ]]; then
            log_message "Missing required environment variables for Supabase API" "ERROR"
            status=1
        else
            # Process each directory in the backup (representing a bucket)
            for bucket_dir in "${temp_dir}/storage"/*; do
                if [[ -d "$bucket_dir" ]]; then
                    bucket_name=$(basename "$bucket_dir")
                    
                    # Check if bucket exists, create if it doesn't
                    if ! curl -s -X GET "${SUPABASE_URL}/storage/v1/bucket/${bucket_name}" \
                        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                        -H "Content-Type: application/json" | jq -e '.name' > /dev/null; then
                        
                        log_message "Creating bucket: $bucket_name" "INFO"
                        if ! curl -s -X POST "${SUPABASE_URL}/storage/v1/bucket" \
                            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                            -H "Content-Type: application/json" \
                            -d "{\"id\":\"${bucket_name}\",\"name\":\"${bucket_name}\",\"public\":false}" | jq -e '.name' > /dev/null; then
                            
                            log_message "Failed to create bucket: $bucket_name" "ERROR"
                            status=1
                            continue
                        fi
                    fi
                    
                    # Upload files to bucket
                    log_message "Uploading files to bucket: $bucket_name" "INFO"
                    find "$bucket_dir" -type f | while read -r file; do
                        relative_path=${file#"$bucket_dir/"}
                        
                        # Upload file
                        if ! curl -s -X POST "${SUPABASE_URL}/storage/v1/object/${bucket_name}/${relative_path}" \
                            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                            -H "Content-Type: multipart/form-data" \
                            --data-binary "@${file}" > /dev/null; then
                            
                            log_message "Failed to upload file: $relative_path to bucket: $bucket_name" "ERROR"
                            status=1
                        fi
                    done
                fi
            done
        fi
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    
    if [[ $status -eq 0 ]]; then
        log_message "Storage restoration completed successfully" "INFO"
    else
        log_message "Storage restoration completed with errors" "ERROR"
    fi
    
    return $status
}

# Restore AI model containers and configurations
# Args:
#   $1: backup_file - Path or name of the AI models backup file
# Returns:
#   0 for success, non-zero for failure
restore_ai_models() {
    local backup_file="$1"
    local temp_dir
    local s3_backup_path
    local ai_models_dir="${SCRIPT_DIR}/../../ai-models"
    local docker_compose_file="${ai_models_dir}/docker-compose.yml"
    local status=0
    
    log_message "Starting AI models restoration from backup: $backup_file" "INFO"
    
    # Validate docker and docker-compose are available
    if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
        log_message "Docker or docker-compose not found, skipping AI model restoration" "WARN"
        return 0
    fi
    
    # Create temporary directory for restoration
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT
    
    # Check if backup file is on S3 or local
    if [[ "$backup_file" != /* && "$backup_file" != ./* ]]; then
        # Assume it's on S3
        s3_backup_path="${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/ai-models/${backup_file}"
        log_message "Downloading AI models backup from $s3_backup_path" "INFO"
        
        if ! aws s3 cp "$s3_backup_path" "${temp_dir}/${backup_file}" 2>&1; then
            log_message "Failed to download AI models backup file from S3" "ERROR"
            return 1
        fi
        
        backup_file="${temp_dir}/${backup_file}"
    fi
    
    # Validate backup file exists and is readable
    if [[ ! -f "$backup_file" ]]; then
        log_message "AI models backup file not found: $backup_file" "ERROR"
        return 1
    fi
    
    # Extract backup
    log_message "Extracting AI models backup" "INFO"
    mkdir -p "${temp_dir}/ai-models"
    if ! tar -xzf "$backup_file" -C "${temp_dir}/ai-models" 2>&1; then
        log_message "Failed to extract AI models backup" "ERROR"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Check if docker-compose.yml exists
    if [[ ! -f "$docker_compose_file" ]]; then
        log_message "Docker compose file not found: $docker_compose_file" "WARN"
        # Copy it from the backup if available
        if [[ -f "${temp_dir}/ai-models/docker-compose.yml" ]]; then
            log_message "Using docker-compose.yml from backup" "INFO"
            mkdir -p "$ai_models_dir"
            cp "${temp_dir}/ai-models/docker-compose.yml" "$docker_compose_file"
        else
            log_message "Docker compose file not found in backup" "ERROR"
            status=1
        fi
    fi
    
    if [[ $status -eq 0 && -f "$docker_compose_file" ]]; then
        # Stop existing containers
        log_message "Stopping running AI containers" "INFO"
        if ! docker-compose -f "$docker_compose_file" down 2>&1; then
            log_message "Failed to stop AI containers, continuing anyway" "WARN"
        fi
        
        # Copy model files and configurations
        log_message "Restoring AI model files and configurations" "INFO"
        
        # Create or update data volumes
        for model_dir in "${temp_dir}/ai-models"/*; do
            if [[ -d "$model_dir" && ! "$(basename "$model_dir")" == "config" ]]; then
                model_name=$(basename "$model_dir")
                target_dir="${ai_models_dir}/${model_name}"
                
                log_message "Restoring model: $model_name" "INFO"
                mkdir -p "$target_dir"
                
                # Copy model files
                if ! cp -rf "${model_dir}"/* "$target_dir/"; then
                    log_message "Failed to copy model files for: $model_name" "ERROR"
                    status=1
                fi
            fi
        done
        
        # Restore configuration files
        if [[ -d "${temp_dir}/ai-models/config" ]]; then
            log_message "Restoring AI model configurations" "INFO"
            mkdir -p "${ai_models_dir}/config"
            if ! cp -rf "${temp_dir}/ai-models/config"/* "${ai_models_dir}/config/"; then
                log_message "Failed to copy AI model configurations" "ERROR"
                status=1
            fi
        fi
        
        # Start containers
        if [[ $status -eq 0 ]]; then
            log_message "Starting AI containers" "INFO"
            if ! docker-compose -f "$docker_compose_file" up -d 2>&1; then
                log_message "Failed to start AI containers" "ERROR"
                status=1
            fi
            
            # Verify models are operational
            log_message "Waiting for AI containers to initialize" "INFO"
            sleep 10
            
            log_message "Checking AI containers status" "INFO"
            if ! docker-compose -f "$docker_compose_file" ps | grep -q "Up"; then
                log_message "AI containers failed to start properly" "ERROR"
                status=1
            else
                log_message "AI containers started successfully" "INFO"
            fi
        fi
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    
    if [[ $status -eq 0 ]]; then
        log_message "AI models restoration completed successfully" "INFO"
    else
        log_message "AI models restoration completed with errors" "ERROR"
    fi
    
    return $status
}

# Perform point-in-time recovery to specific timestamp
# Args:
#   $1: timestamp - Target recovery time in format YYYY-MM-DD HH:MM:SS
# Returns:
#   0 for success, non-zero for failure
point_in_time_recovery() {
    local timestamp="$1"
    local temp_dir
    local recovery_file
    local status=0
    
    log_message "Starting point-in-time recovery to timestamp: $timestamp" "INFO"
    
    # Validate timestamp format
    if [[ ! "$timestamp" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2}$ ]]; then
        log_message "Invalid timestamp format. Expected format: YYYY-MM-DD HH:MM:SS" "ERROR"
        return 1
    fi
    
    # Create temporary directory
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT
    
    # Find appropriate backup files for the timestamp
    log_message "Finding appropriate backup files for timestamp: $timestamp" "INFO"
    
    # For PostgreSQL 14+, recovery is configured via postgresql.conf and recovery signal files
    log_message "Setting up recovery configuration" "INFO"
    recovery_file="${temp_dir}/recovery.conf"
    
    echo "restore_command = 'cp ${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/wal/%f %p'" > "$recovery_file"
    echo "recovery_target_time = '$timestamp'" >> "$recovery_file"
    echo "recovery_target_action = 'promote'" >> "$recovery_file"
    
    log_message "This is a simplified implementation. In a production environment, point-in-time recovery would require direct access to the PostgreSQL server." "WARN"
    log_message "For Supabase-hosted databases, contact Supabase support to perform point-in-time recovery." "WARN"
    
    # Check if we have direct access to PostgreSQL data directory (unlikely in managed environments)
    local pg_data
    if [[ -n "$PGDATA" ]]; then
        pg_data="$PGDATA"
    else
        pg_data=$(psql -c "SHOW data_directory;" -t | xargs)
    fi
    
    if [[ -d "$pg_data" && -w "$pg_data" ]]; then
        log_message "Found writable PostgreSQL data directory: $pg_data" "INFO"
        
        # For PostgreSQL 14+
        # Create recovery signal file
        touch "${pg_data}/recovery.signal"
        
        # Add recovery settings to postgresql.auto.conf
        cat <<EOF >> "${pg_data}/postgresql.auto.conf"
recovery_target_time = '$timestamp'
restore_command = 'cp ${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/wal/%f %p'
recovery_target_action = 'promote'
EOF
        
        # Restart PostgreSQL
        log_message "Restarting PostgreSQL to begin recovery" "INFO"
        # In practice, this would vary based on the PostgreSQL installation
        if ! pg_ctl restart -D "$pg_data"; then
            log_message "Failed to restart PostgreSQL" "ERROR"
            status=1
        else
            # Wait for recovery to complete
            log_message "Waiting for recovery to complete" "INFO"
            
            # Monitor recovery progress with timeout
            local timeout=3600  # 1 hour timeout
            local elapsed=0
            local recovery_complete=false
            
            while [[ $elapsed -lt $timeout ]]; do
                if psql -c "SELECT pg_is_in_recovery();" -t | grep -q "f"; then
                    recovery_complete=true
                    break
                fi
                
                sleep 10
                elapsed=$((elapsed + 10))
                
                if [[ $((elapsed % 60)) -eq 0 ]]; then
                    log_message "Recovery in progress. Elapsed time: $elapsed seconds" "INFO"
                fi
            done
            
            if [[ "$recovery_complete" == "true" ]]; then
                log_message "Point-in-time recovery completed successfully" "INFO"
            else
                log_message "Recovery timeout exceeded" "ERROR"
                status=1
            fi
        fi
    else
        log_message "No direct access to PostgreSQL data directory. Manual intervention required." "ERROR"
        log_message "For managed databases like Supabase, use their dashboard or contact support." "INFO"
        status=1
    fi
    
    # Clean up
    rm -rf "$temp_dir"
    
    return $status
}

# Restore environment configuration files
# Args:
#   $1: backup_file - Path or name of the environment config backup file
# Returns:
#   0 for success, non-zero for failure
restore_environment_config() {
    local backup_file="$1"
    local temp_dir
    local s3_backup_path
    local status=0
    
    log_message "Starting environment configuration restoration from backup: $backup_file" "INFO"
    
    # Create temporary directory for restoration
    temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT
    
    # Check if backup file is on S3 or local
    if [[ "$backup_file" != /* && "$backup_file" != ./* ]]; then
        # Assume it's on S3
        s3_backup_path="${BACKUP_STORAGE_PATH}/${ENVIRONMENT}/config/${backup_file}"
        log_message "Downloading config backup from $s3_backup_path" "INFO"
        
        if ! aws s3 cp "$s3_backup_path" "${temp_dir}/${backup_file}" 2>&1; then
            log_message "Failed to download config backup file from S3" "ERROR"
            return 1
        fi
        
        backup_file="${temp_dir}/${backup_file}"
    fi
    
    # Validate backup file exists and is readable
    if [[ ! -f "$backup_file" ]]; then
        log_message "Config backup file not found: $backup_file" "ERROR"
        return 1
    fi
    
    # Extract backup
    log_message "Extracting environment configuration backup" "INFO"
    mkdir -p "${temp_dir}/config"
    if ! tar -xzf "$backup_file" -C "${temp_dir}/config" 2>&1; then
        log_message "Failed to extract config backup" "ERROR"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Restore configuration files
    log_message "Restoring environment configuration files" "INFO"
    
    # Restore .env file if it exists in the backup
    if [[ -f "${temp_dir}/config/.env" ]]; then
        log_message "Restoring .env file" "INFO"
        
        # Make backup of existing .env file if it exists
        if [[ -f "$CONFIG_FILE" ]]; then
            log_message "Backing up existing .env file to ${CONFIG_FILE}.bak" "INFO"
            cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
        fi
        
        # Copy new .env file
        if ! cp "${temp_dir}/config/.env" "$CONFIG_FILE"; then
            log_message "Failed to restore .env file" "ERROR"
            status=1
        fi
    else
        log_message ".env file not found in backup" "WARN"
    fi
    
    # Restore other configuration files if they exist
    for config_file in "${temp_dir}/config"/*; do
        if [[ -f "$config_file" && "$(basename "$config_file")" != ".env" ]]; then
            target_file="${SCRIPT_DIR}/../../$(basename "$config_file")"
            log_message "Restoring config file: $(basename "$config_file")" "INFO"
            
            # Make backup of existing file if it exists
            if [[ -f "$target_file" ]]; then
                log_message "Backing up existing file to ${target_file}.bak" "INFO"
                cp "$target_file" "${target_file}.bak"
            fi
            
            # Copy new config file
            if ! cp "$config_file" "$target_file"; then
                log_message "Failed to restore config file: $(basename "$config_file")" "ERROR"
                status=1
            fi
        fi
    done
    
    # Clean up
    rm -rf "$temp_dir"
    
    if [[ $status -eq 0 ]]; then
        log_message "Environment configuration restoration completed successfully" "INFO"
    else
        log_message "Environment configuration restoration completed with errors" "ERROR"
    fi
    
    return $status
}

# Verify system functionality after restoration
# Returns:
#   0 for success, non-zero for failure
verify_restored_system() {
    local status=0
    
    log_message "Verifying system functionality after restoration" "INFO"
    
    # Test database connectivity
    if [[ "$RESTORE_DB" == "true" ]]; then
        log_message "Verifying database connectivity" "INFO"
        if ! psql -c "SELECT version();" > /dev/null 2>&1; then
            log_message "Database connectivity verification failed" "ERROR"
            status=1
        else
            log_message "Database connectivity verified" "INFO"
            
            # Test basic queries
            log_message "Testing basic database queries" "INFO"
            if ! psql -c "SELECT COUNT(*) FROM pg_catalog.pg_tables;" > /dev/null 2>&1; then
                log_message "Database query verification failed" "ERROR"
                status=1
            else
                log_message "Database query verification successful" "INFO"
            fi
        fi
    fi
    
    # Test storage accessibility
    if [[ "$RESTORE_STORAGE" == "true" ]]; then
        log_message "Verifying storage accessibility" "INFO"
        
        if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_SERVICE_KEY" ]]; then
            # List buckets as a simple check
            if ! curl -s -X GET "${SUPABASE_URL}/storage/v1/bucket" \
                -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
                -H "Content-Type: application/json" | jq -e '.[0]' > /dev/null; then
                
                log_message "Storage accessibility verification failed" "ERROR"
                status=1
            else
                log_message "Storage accessibility verified" "INFO"
            fi
        else
            log_message "Skipping storage verification due to missing credentials" "WARN"
        fi
    fi
    
    # Test AI services
    if [[ "$RESTORE_AI_MODELS" == "true" ]]; then
        log_message "Verifying AI services" "INFO"
        
        # Simple check to see if containers are running
        if command -v docker &> /dev/null; then
            if ! docker ps | grep -q "llama\|mistral"; then
                log_message "AI containers not found or not running" "WARN"
            else
                log_message "AI containers are running" "INFO"
                log_message "Detailed AI service verification would require API testing" "INFO"
            fi
        else
            log_message "Docker not available, skipping AI service verification" "WARN"
        fi
    fi
    
    if [[ $status -eq 0 ]]; then
        log_message "System verification completed successfully" "INFO"
    else
        log_message "System verification completed with errors" "ERROR"
        log_message "Manual intervention may be required to fully restore functionality" "WARN"
    fi
    
    return $status
}

# Clean up temporary files and resources
cleanup() {
    log_message "Cleaning up temporary resources" "INFO"
    
    # Remove any temp directories that might be left
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    
    # Reset environment variables
    unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
    
    log_message "Cleanup completed" "INFO"
}

# Display usage help message
display_help() {
    echo "Engagerr System Restore Script"
    echo "==============================="
    echo "This script restores Engagerr system backups including database, file storage,"
    echo "AI models, and configurations to recover from failures or migrate environments."
    echo
    echo "Usage: $(basename "$0") [options]"
    echo
    echo "Options:"
    echo "  -t TYPE     Backup type to restore (full, incremental, point-in-time)"
    echo "              Default: full"
    echo "  -f FILE     Backup file name or path"
    echo "  -p TIME     Point-in-time recovery timestamp (format: YYYY-MM-DD HH:MM:SS)"
    echo "              This option sets backup type to point-in-time"
    echo "  -e ENV      Environment (development, staging, production)"
    echo "              Default: Value from .env file or 'development'"
    echo "  -l          List available backups and exit"
    echo "  -d          Restore database only"
    echo "  -s          Restore storage only"
    echo "  -a          Restore AI models only"
    echo "  -c          Restore configuration only"
    echo "  -h          Display this help message and exit"
    echo
    echo "Examples:"
    echo "  $(basename "$0") -l                         # List available full backups"
    echo "  $(basename "$0") -t full -l                 # List available full backups"
    echo "  $(basename "$0") -t incremental -l          # List available incremental backups"
    echo "  $(basename "$0") -f backup_20231016.backup  # Restore from specific backup file"
    echo "  $(basename "$0") -p \"2023-10-16 14:30:00\"   # Restore to specific point in time"
    echo "  $(basename "$0") -d -f database_backup.sql  # Restore only the database"
    echo
    echo "Troubleshooting:"
    echo "  - Check logs in the '../logs/' directory for detailed error messages"
    echo "  - Ensure AWS CLI is configured with appropriate credentials if using S3 backups"
    echo "  - For Supabase-hosted databases, some operations may require manual intervention"
}

# Parse command line arguments
# Args:
#   $@ - Command line arguments
# Returns:
#   0 if arguments are valid, non-zero otherwise
parse_arguments() {
    # Default values
    BACKUP_TYPE="full"
    BACKUP_FILE=""
    TIMESTAMP=""
    LIST_BACKUPS=false
    RESTORE_DB=true
    RESTORE_STORAGE=true
    RESTORE_AI_MODELS=true
    RESTORE_CONFIG=true
    
    # Parse options
    while getopts "t:f:p:e:lhdsac" opt; do
        case $opt in
            t)
                BACKUP_TYPE="$OPTARG"
                if [[ ! " ${BACKUP_TYPES[*]} " =~ " ${BACKUP_TYPE} " ]]; then
                    log_message "Invalid backup type: $BACKUP_TYPE. Valid types are: ${BACKUP_TYPES[*]}" "ERROR"
                    return 1
                fi
                ;;
            f)
                BACKUP_FILE="$OPTARG"
                ;;
            p)
                TIMESTAMP="$OPTARG"
                BACKUP_TYPE="point-in-time"
                ;;
            e)
                ENVIRONMENT="$OPTARG"
                ;;
            l)
                LIST_BACKUPS=true
                ;;
            d)
                RESTORE_DB=true
                RESTORE_STORAGE=false
                RESTORE_AI_MODELS=false
                RESTORE_CONFIG=false
                ;;
            s)
                RESTORE_DB=false
                RESTORE_STORAGE=true
                RESTORE_AI_MODELS=false
                RESTORE_CONFIG=false
                ;;
            a)
                RESTORE_DB=false
                RESTORE_STORAGE=false
                RESTORE_AI_MODELS=true
                RESTORE_CONFIG=false
                ;;
            c)
                RESTORE_DB=false
                RESTORE_STORAGE=false
                RESTORE_AI_MODELS=false
                RESTORE_CONFIG=true
                ;;
            h)
                display_help
                exit 0
                ;;
            \?)
                log_message "Invalid option: -$OPTARG" "ERROR"
                display_help
                return 1
                ;;
            :)
                log_message "Option -$OPTARG requires an argument" "ERROR"
                display_help
                return 1
                ;;
        esac
    done
    
    # Validate arguments
    if [[ "$LIST_BACKUPS" == "true" ]]; then
        # No need to validate further if just listing backups
        return 0
    fi
    
    if [[ -z "$BACKUP_FILE" && "$BACKUP_TYPE" != "point-in-time" ]]; then
        log_message "Backup file (-f) is required unless listing backups or performing point-in-time recovery" "ERROR"
        return 1
    fi
    
    if [[ "$BACKUP_TYPE" == "point-in-time" && -z "$TIMESTAMP" ]]; then
        log_message "Timestamp (-p) is required for point-in-time recovery" "ERROR"
        return 1
    fi
    
    # Log parsed arguments
    log_message "Parsed arguments:" "INFO"
    log_message "  Backup type: $BACKUP_TYPE" "INFO"
    log_message "  Backup file: $BACKUP_FILE" "INFO"
    log_message "  Environment: $ENVIRONMENT" "INFO"
    log_message "  List backups: $LIST_BACKUPS" "INFO"
    log_message "  Restore database: $RESTORE_DB" "INFO"
    log_message "  Restore storage: $RESTORE_STORAGE" "INFO"
    log_message "  Restore AI models: $RESTORE_AI_MODELS" "INFO"
    log_message "  Restore config: $RESTORE_CONFIG" "INFO"
    
    if [[ "$BACKUP_TYPE" == "point-in-time" ]]; then
        log_message "  Timestamp: $TIMESTAMP" "INFO"
    fi
    
    return 0
}

# Main function
# Args:
#   $@ - Command line arguments
# Returns:
#   0 for success, non-zero for failure
main() {
    local status=0
    
    # Set up trap for cleanup on exit
    trap cleanup EXIT
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log_message "Starting Engagerr system restoration script" "INFO"
    
    # Parse command line arguments
    if ! parse_arguments "$@"; then
        log_message "Failed to parse command line arguments" "ERROR"
        return 1
    fi
    
    # Load environment variables
    if ! load_env; then
        log_message "Failed to load environment variables" "ERROR"
        return 1
    fi
    
    # Check dependencies
    if ! check_dependencies; then
        log_message "Failed dependency check" "ERROR"
        return 1
    fi
    
    # List backups if requested
    if [[ "$LIST_BACKUPS" == "true" ]]; then
        list_available_backups "$BACKUP_TYPE"
        return $?
    fi
    
    # Handle point-in-time recovery
    if [[ "$BACKUP_TYPE" == "point-in-time" && -n "$TIMESTAMP" ]]; then
        log_message "Performing point-in-time recovery to timestamp: $TIMESTAMP" "INFO"
        if ! point_in_time_recovery "$TIMESTAMP"; then
            log_message "Point-in-time recovery failed" "ERROR"
            status=1
        else
            log_message "Point-in-time recovery completed successfully" "INFO"
        fi
        return $status
    fi
    
    # Validate backup file exists if not doing point-in-time recovery
    if [[ -z "$BACKUP_FILE" ]]; then
        log_message "No backup file specified" "ERROR"
        return 1
    fi
    
    # Perform database restoration if requested
    if [[ "$RESTORE_DB" == "true" ]]; then
        if ! restore_database "$BACKUP_FILE" "$BACKUP_TYPE"; then
            log_message "Database restoration failed" "ERROR"
            status=1
        fi
    fi
    
    # Perform storage restoration if requested
    if [[ "$RESTORE_STORAGE" == "true" ]]; then
        if ! restore_storage "$BACKUP_FILE"; then
            log_message "Storage restoration failed" "ERROR"
            status=1
        fi
    fi
    
    # Perform AI model restoration if requested
    if [[ "$RESTORE_AI_MODELS" == "true" ]]; then
        if ! restore_ai_models "$BACKUP_FILE"; then
            log_message "AI model restoration failed" "ERROR"
            status=1
        fi
    fi
    
    # Restore environment configuration if requested
    if [[ "$RESTORE_CONFIG" == "true" ]]; then
        if ! restore_environment_config "$BACKUP_FILE"; then
            log_message "Environment configuration restoration failed" "ERROR"
            status=1
        fi
    fi
    
    # Verify system functionality after restoration
    if ! verify_restored_system; then
        log_message "System verification failed" "ERROR"
        status=1
    fi
    
    if [[ $status -eq 0 ]]; then
        log_message "Engagerr system restoration completed successfully" "INFO"
    else
        log_message "Engagerr system restoration completed with errors. Check the log file for details: $LOG_FILE" "ERROR"
    fi
    
    return $status
}

# Execute main function if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    main "$@"
    exit $?
fi