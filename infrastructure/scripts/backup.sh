#!/bin/bash
# backup.sh - Automated database backup script for Engagerr platform
# Description: Performs full and incremental backups of PostgreSQL database with retention management
# Version: 1.0.0

# Set strict error handling
set -e
set -o pipefail

# Global variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
LOG_FILE="${SCRIPT_DIR}/logs/backup_${TIMESTAMP}.log"
CONFIG_FILE="${SCRIPT_DIR}/backup.conf"
BACKUP_TYPE="full"  # Default backup type

# Default configuration values
BACKUP_DIR="${SCRIPT_DIR}/backups"
DB_NAME="engagerr"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
FULL_BACKUP_RETENTION_DAYS=30
INCREMENTAL_BACKUP_RETENTION_DAYS=7
S3_BUCKET=""  # Empty by default, must be configured for S3 uploads
NOTIFICATION_EMAIL=""  # Empty by default, must be configured for email notifications
NOTIFICATION_WEBHOOK=""  # Empty by default, must be configured for webhook notifications

# Function: log
# Description: Logs a message to the log file and stdout
# Parameters:
#   $1: Log level (INFO, WARNING, ERROR)
#   $2: Message to log
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Format log message
    local log_message="[${timestamp}] [${level}] ${message}"
    
    # Write to log file
    echo "${log_message}" >> "${LOG_FILE}"
    
    # Print to stdout
    if [[ "${level}" == "ERROR" ]]; then
        echo "${log_message}" >&2
    else
        echo "${log_message}"
    fi
}

# Function: handle_error
# Description: Handles errors during backup process
# Parameters:
#   $1: Error message
#   $2: Exit code
handle_error() {
    local error_message="$1"
    local exit_code="$2"
    
    log "ERROR" "${error_message}"
    
    # Send notification about backup failure
    send_notification "Engagerr Backup Failure" "Backup process failed: ${error_message}"
    
    # Perform any necessary cleanup
    # (Add specific cleanup code here if needed)
    
    exit "${exit_code}"
}

# Function: usage
# Description: Displays script usage information
usage() {
    echo "Usage: $(basename $0) [OPTIONS]"
    echo
    echo "Automated database backup script for Engagerr platform"
    echo
    echo "Options:"
    echo "  --full          Perform a full database backup (default)"
    echo "  --incremental   Perform an incremental backup using WAL archiving"
    echo "  --config FILE   Use specific configuration file"
    echo "  --help          Display this help message"
    echo
    echo "Examples:"
    echo "  $(basename $0) --full              # Perform a full backup"
    echo "  $(basename $0) --incremental       # Perform an incremental backup"
    echo "  $(basename $0) --config custom.conf  # Use custom configuration file"
    echo
}

# Function: setup_environment
# Description: Sets up the backup environment, creates necessary directories
setup_environment() {
    # Create backup directory if it doesn't exist
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        mkdir -p "${BACKUP_DIR}/full"
        mkdir -p "${BACKUP_DIR}/incremental"
        log "INFO" "Created backup directories at ${BACKUP_DIR}"
    fi
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Log script start
    log "INFO" "Starting Engagerr database backup (type: ${BACKUP_TYPE})"
    
    # Check if required tools are installed
    command -v pg_dump >/dev/null 2>&1 || { handle_error "pg_dump is required but not installed" 1; }
    command -v gzip >/dev/null 2>&1 || { handle_error "gzip is required but not installed" 1; }
    
    if [[ "${BACKUP_TYPE}" == "incremental" ]]; then
        command -v pg_basebackup >/dev/null 2>&1 || { handle_error "pg_basebackup is required but not installed" 1; }
    fi
    
    if [[ -n "${S3_BUCKET}" ]]; then
        command -v aws >/dev/null 2>&1 || { handle_error "aws CLI is required for S3 uploads but not installed" 1; }
    fi
    
    # Load configuration from file if specified
    if [[ -f "${CONFIG_FILE}" ]]; then
        log "INFO" "Loading configuration from ${CONFIG_FILE}"
        source "${CONFIG_FILE}"
    fi
    
    # Validate required parameters
    [[ -z "${DB_NAME}" ]] && handle_error "Database name (DB_NAME) is required" 1
    [[ -z "${DB_USER}" ]] && handle_error "Database user (DB_USER) is required" 1
    [[ -z "${DB_HOST}" ]] && handle_error "Database host (DB_HOST) is required" 1
    
    log "INFO" "Environment setup complete"
    return 0
}

# Function: perform_full_backup
# Description: Performs a full database backup using pg_dump
perform_full_backup() {
    local backup_file="${BACKUP_DIR}/full/engagerr_full_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    local checksum_file="${compressed_file}.md5"
    
    log "INFO" "Starting full backup of database ${DB_NAME} to ${backup_file}"
    
    # Set up PostgreSQL connection parameters
    export PGPASSWORD="${DB_PASSWORD}"
    
    # Execute pg_dump
    if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -Fc -f "${backup_file}" "${DB_NAME}"; then
        log "INFO" "Database dump completed successfully"
        
        # Compress the backup file
        log "INFO" "Compressing backup file"
        gzip -f "${backup_file}"
        
        # Create a checksum file for verification
        md5sum "${compressed_file}" > "${checksum_file}"
        
        log "INFO" "Full backup completed and compressed: ${compressed_file}"
        
        # Unset password environment variable for security
        unset PGPASSWORD
        
        # Return the file path for further processing
        echo "${compressed_file}"
        return 0
    else
        local exit_code=$?
        unset PGPASSWORD
        handle_error "Failed to create full backup" "${exit_code}"
    fi
}

# Function: perform_incremental_backup
# Description: Performs an incremental backup using WAL archiving
perform_incremental_backup() {
    local backup_dir="${BACKUP_DIR}/incremental/engagerr_inc_${TIMESTAMP}"
    local compressed_file="${backup_dir}.tar.gz"
    local checksum_file="${compressed_file}.md5"
    
    log "INFO" "Starting incremental backup of database ${DB_NAME} to ${backup_dir}"
    
    # Set up PostgreSQL connection parameters
    export PGPASSWORD="${DB_PASSWORD}"
    
    # Create temporary directory for WAL segments
    mkdir -p "${backup_dir}"
    
    # Execute pg_basebackup for WAL segment backup
    if pg_basebackup -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -D "${backup_dir}" -Xs -P -v; then
        log "INFO" "WAL segments backup completed successfully"
        
        # Compress the backup directory
        log "INFO" "Compressing backup directory"
        tar -czf "${compressed_file}" -C "$(dirname "${backup_dir}")" "$(basename "${backup_dir}")"
        
        # Remove the uncompressed backup directory
        rm -rf "${backup_dir}"
        
        # Create a checksum file for verification
        md5sum "${compressed_file}" > "${checksum_file}"
        
        log "INFO" "Incremental backup completed and compressed: ${compressed_file}"
        
        # Unset password environment variable for security
        unset PGPASSWORD
        
        # Return the file path for further processing
        echo "${compressed_file}"
        return 0
    else
        local exit_code=$?
        unset PGPASSWORD
        handle_error "Failed to create incremental backup" "${exit_code}"
    fi
}

# Function: upload_to_s3
# Description: Uploads backup file to S3 for offsite storage
# Parameters:
#   $1: Backup file path
upload_to_s3() {
    local backup_file="$1"
    local checksum_file="${backup_file}.md5"
    
    # Skip if S3 bucket is not configured
    if [[ -z "${S3_BUCKET}" ]]; then
        log "INFO" "S3 backup disabled (S3_BUCKET not configured)"
        return 0
    fi
    
    log "INFO" "Uploading backup to S3: ${S3_BUCKET}"
    
    # Upload backup file to S3
    if aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/$(basename "${backup_file}")"; then
        log "INFO" "Backup file uploaded to S3 successfully"
        
        # Upload checksum file
        if aws s3 cp "${checksum_file}" "s3://${S3_BUCKET}/$(basename "${checksum_file}")"; then
            log "INFO" "Checksum file uploaded to S3 successfully"
            
            # Verify the upload with an S3 ls command
            if aws s3 ls "s3://${S3_BUCKET}/$(basename "${backup_file}")"; then
                log "INFO" "Verified backup file exists in S3"
                return 0
            else
                handle_error "Backup file upload verification failed" 1
            fi
        else
            local exit_code=$?
            handle_error "Failed to upload checksum file to S3" "${exit_code}"
        fi
    else
        local exit_code=$?
        handle_error "Failed to upload backup file to S3" "${exit_code}"
    fi
}

# Function: cleanup_old_backups
# Description: Removes old backup files based on retention policy
# Parameters:
#   $1: Backup type ('full' or 'incremental')
cleanup_old_backups() {
    local backup_type="$1"
    local retention_days
    local backup_path
    
    if [[ "${backup_type}" == "full" ]]; then
        retention_days="${FULL_BACKUP_RETENTION_DAYS}"
        backup_path="${BACKUP_DIR}/full"
    else
        retention_days="${INCREMENTAL_BACKUP_RETENTION_DAYS}"
        backup_path="${BACKUP_DIR}/incremental"
    fi
    
    log "INFO" "Cleaning up old ${backup_type} backups (retention: ${retention_days} days)"
    
    # Find and remove old local backup files
    find "${backup_path}" -type f -name "engagerr_*" -mtime +${retention_days} -exec ls -l {} \; -exec rm -f {} \; 2>/dev/null || true
    find "${backup_path}" -type f -name "*.md5" -mtime +${retention_days} -exec ls -l {} \; -exec rm -f {} \; 2>/dev/null || true
    
    log "INFO" "Local backup cleanup completed"
    
    # Cleanup S3 if configured
    if [[ -n "${S3_BUCKET}" ]]; then
        local cutoff_date=$(date -d "-${retention_days} days" +"%Y-%m-%d")
        
        log "INFO" "Cleaning up old ${backup_type} backups from S3 (before ${cutoff_date})"
        
        # List old files in S3 and remove them
        aws s3 ls "s3://${S3_BUCKET}/" | grep "engagerr_${backup_type:0:4}" | while read -r line; do
            local file_date=$(echo "${line}" | awk '{print $1}')
            local file_name=$(echo "${line}" | awk '{print $4}')
            
            if [[ "${file_date}" < "${cutoff_date}" ]]; then
                log "INFO" "Removing old S3 backup: ${file_name}"
                aws s3 rm "s3://${S3_BUCKET}/${file_name}"
                # Also remove the checksum file if it exists
                aws s3 rm "s3://${S3_BUCKET}/${file_name}.md5" 2>/dev/null || true
            fi
        done
        
        log "INFO" "S3 backup cleanup completed"
    fi
    
    return 0
}

# Function: send_notification
# Description: Sends notification about backup status
# Parameters:
#   $1: Subject
#   $2: Message
send_notification() {
    local subject="$1"
    local message="$2"
    local hostname=$(hostname)
    local formatted_message="Host: ${hostname}\nTimestamp: $(date)\n\n${message}"
    
    # Check if email notification is configured
    if [[ -n "${NOTIFICATION_EMAIL}" ]]; then
        log "INFO" "Sending email notification to ${NOTIFICATION_EMAIL}"
        
        # Simple email using mail command
        echo -e "${formatted_message}" | mail -s "${subject}" "${NOTIFICATION_EMAIL}" || log "WARNING" "Failed to send email notification"
    fi
    
    # Check if webhook notification is configured
    if [[ -n "${NOTIFICATION_WEBHOOK}" ]]; then
        log "INFO" "Sending webhook notification to ${NOTIFICATION_WEBHOOK}"
        
        # JSON payload for webhook
        local json_payload="{\"subject\":\"${subject}\",\"message\":\"${formatted_message}\",\"host\":\"${hostname}\",\"timestamp\":\"$(date -Iseconds)\"}"
        
        # Send POST request to webhook URL
        curl -s -X POST -H "Content-Type: application/json" -d "${json_payload}" "${NOTIFICATION_WEBHOOK}" || log "WARNING" "Failed to send webhook notification"
    fi
    
    return 0
}

# Function: main
# Description: Main function that orchestrates the backup process
main() {
    local backup_file
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                BACKUP_TYPE="full"
                shift
                ;;
            --incremental)
                BACKUP_TYPE="incremental"
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Set up the environment
    setup_environment || handle_error "Failed to set up environment" $?
    
    # Perform the backup based on the specified type
    if [[ "${BACKUP_TYPE}" == "full" ]]; then
        backup_file=$(perform_full_backup) || handle_error "Failed to perform full backup" $?
    else
        backup_file=$(perform_incremental_backup) || handle_error "Failed to perform incremental backup" $?
    fi
    
    # Upload backup to S3 if configured
    upload_to_s3 "${backup_file}" || handle_error "Failed to upload backup to S3" $?
    
    # Clean up old backups
    cleanup_old_backups "${BACKUP_TYPE}" || log "WARNING" "Backup cleanup encountered issues"
    
    # Send success notification
    send_notification "Engagerr Backup Success" "Backup completed successfully: $(basename "${backup_file}")\nType: ${BACKUP_TYPE}\nSize: $(du -h "${backup_file}" | cut -f1)"
    
    log "INFO" "Backup process completed successfully"
    return 0
}

# Execute main function
main "$@"