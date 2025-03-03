import React, { useState, useRef, useCallback } from 'react';
import { useController, type Control } from 'react-hook-form';
import { Upload, X, File, Image, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

/**
 * Formats a file size in bytes to a human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0 || !bytes) return '0 Bytes';
  
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Validates if a file's type matches the accepted file types
 */
function isValidFileType(file: File, accept?: string): boolean {
  if (!accept) return true;
  
  const acceptedTypes = accept.split(',').map(type => type.trim());
  const fileType = file.type;
  const fileName = file.name;
  
  return acceptedTypes.some(type => {
    // Handle wildcard MIME types (e.g., image/*)
    if (type.endsWith('/*')) {
      const category = type.replace('/*', '');
      return fileType.startsWith(category);
    }
    
    // Handle file extensions (e.g., .jpg)
    if (type.startsWith('.')) {
      return fileName.toLowerCase().endsWith(type.toLowerCase());
    }
    
    // Handle exact MIME types
    return fileType === type;
  });
}

export interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** File types to accept (e.g., 'image/*,.pdf') */
  accept?: string;
  /** Whether to allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes (default: 5MB) */
  maxSize?: number;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Controlled component value */
  value?: File | File[];
  /** Default value for uncontrolled component */
  defaultValue?: File | File[];
  /** Callback when files change */
  onChange?: (files: File | File[]) => void;
  /** Callback when validation errors occur */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** react-hook-form control object */
  control?: Control<any>;
  /** Field name for form integration */
  name?: string;
  /** Whether to show file previews */
  showPreview?: boolean;
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      accept,
      multiple = false,
      maxSize = 5 * 1024 * 1024, // 5MB default
      maxFiles,
      disabled = false,
      value,
      defaultValue,
      onChange,
      onError,
      className,
      control,
      name,
      showPreview = true,
      ...props
    },
    ref
  ) => {
    // Initialize state for uncontrolled component
    const [files, setFiles] = useState<File[]>(() => {
      if (defaultValue) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      }
      return [];
    });
    
    // Track drag state
    const [dragActive, setDragActive] = useState(false);
    
    // Track validation errors
    const [errors, setErrors] = useState<string[]>([]);
    
    // Reference to the file input element
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Use react-hook-form controller if control and name are provided
    const isFormControlled = control && name;
    const {
      field: { value: fieldValue, onChange: fieldOnChange } = { value: undefined, onChange: () => {} },
    } = isFormControlled ? useController({ control, name: name as string }) : { field: {} };
    
    // Determine if component is controlled externally
    const isControlled = value !== undefined;
    
    // Use the appropriate value source based on controlled status
    const fileList = isControlled 
      ? (Array.isArray(value) ? value : value ? [value] : []) 
      : isFormControlled 
        ? (Array.isArray(fieldValue) ? fieldValue : fieldValue ? [fieldValue] : []) 
        : files;
    
    // Handle file validation
    const validateFiles = useCallback((filesToValidate: File[]): { valid: File[], errors: string[] } => {
      const validFiles: File[] = [];
      const newErrors: string[] = [];
      
      // Check max files limit
      const totalFiles = multiple ? fileList.length + filesToValidate.length : filesToValidate.length;
      if (maxFiles && totalFiles > maxFiles) {
        newErrors.push(`Too many files. Maximum allowed: ${maxFiles}`);
        return { valid: validFiles, errors: newErrors };
      }
      
      // Validate each file
      filesToValidate.forEach(file => {
        // Check file type
        if (!isValidFileType(file, accept)) {
          newErrors.push(`"${file.name}" has an invalid file type`);
          return;
        }
        
        // Check file size
        if (file.size > maxSize) {
          newErrors.push(`"${file.name}" exceeds the maximum size of ${formatFileSize(maxSize)}`);
          return;
        }
        
        validFiles.push(file);
      });
      
      return { valid: validFiles, errors: newErrors };
    }, [accept, maxFiles, maxSize, multiple, fileList.length]);
    
    // Handle drag events
    const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave' || e.type === 'drop') {
        setDragActive(false);
      }
    }, [disabled]);
    
    // Handle dropped files
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      setDragActive(false);
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (!droppedFiles.length) return;
      
      // For single file upload, just take the first file
      const filesToProcess = multiple ? droppedFiles : [droppedFiles[0]];
      
      const { valid, errors: newErrors } = validateFiles(filesToProcess);
      
      if (newErrors.length > 0) {
        setErrors(newErrors);
        onError?.(newErrors.join(', '));
        return;
      }
      
      // Update state based on component type
      if (!isControlled && !isFormControlled) {
        setFiles(multiple ? [...fileList, ...valid] : valid);
      }
      
      // Call onChange handlers
      const result = multiple ? [...fileList, ...valid] : valid[0];
      
      if (isFormControlled) {
        fieldOnChange(result);
      } else {
        onChange?.(result);
      }
      
      setErrors([]);
    }, [disabled, multiple, validateFiles, fileList, isControlled, isFormControlled, fieldOnChange, onChange, onError]);
    
    // Handle file input change
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      
      const selectedFiles = Array.from(e.target.files);
      const filesToProcess = multiple ? selectedFiles : [selectedFiles[0]];
      
      const { valid, errors: newErrors } = validateFiles(filesToProcess);
      
      if (newErrors.length > 0) {
        setErrors(newErrors);
        onError?.(newErrors.join(', '));
        return;
      }
      
      // Update state based on component type
      if (!isControlled && !isFormControlled) {
        setFiles(multiple ? [...fileList, ...valid] : valid);
      }
      
      // Call onChange handlers
      const result = multiple ? [...fileList, ...valid] : valid[0];
      
      if (isFormControlled) {
        fieldOnChange(result);
      } else {
        onChange?.(result);
      }
      
      // Reset the input
      e.target.value = '';
      setErrors([]);
    }, [multiple, validateFiles, fileList, isControlled, isFormControlled, fieldOnChange, onChange, onError]);
    
    // Handle file deletion
    const handleDelete = useCallback((index: number) => {
      const newFiles = [...fileList];
      newFiles.splice(index, 1);
      
      // Update state based on component type
      if (!isControlled && !isFormControlled) {
        setFiles(newFiles);
      }
      
      // Call onChange handlers
      const result = multiple ? newFiles : newFiles[0];
      
      if (isFormControlled) {
        fieldOnChange(result);
      } else {
        onChange?.(result);
      }
      
      setErrors([]);
    }, [fileList, isControlled, isFormControlled, fieldOnChange, onChange, multiple]);
    
    // Trigger file browser on button click
    const handleButtonClick = () => {
      inputRef.current?.click();
    };
    
    // Check if a file is an image
    const isImageFile = (file: File) => {
      return file.type.startsWith('image/');
    };
    
    // Create URL objects for file previews
    const fileURLs = fileList.map(file => {
      if (isImageFile(file)) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    
    // Cleanup URL objects when component unmounts
    React.useEffect(() => {
      return () => {
        fileURLs.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
      };
    }, [fileURLs]);
    
    return (
      <div className={cn('w-full', className)}>
        {/* Drag and drop area */}
        <div
          className={cn(
            'relative flex flex-col items-center justify-center w-full min-h-[150px] border-2 border-dashed rounded-lg transition-colors',
            dragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50',
            disabled && 'opacity-60 cursor-not-allowed',
            'hover:bg-gray-100'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          aria-disabled={disabled}
        >
          {/* Hidden file input */}
          <input
            ref={(e) => {
              // Handle both the component's ref and the internal inputRef
              if (typeof ref === 'function') {
                ref(e);
              } else if (ref) {
                ref.current = e;
              }
              inputRef.current = e;
            }}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={handleChange}
            {...props}
          />
          
          {/* Upload instructions */}
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <Upload className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" />
            <p className="mb-2 text-sm text-gray-700">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {accept ? `Accepts: ${accept}` : 'All file types supported'}
              {maxSize && ` (Max size: ${formatFileSize(maxSize)})`}
              {maxFiles && multiple && `, Max files: ${maxFiles}`}
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="mt-4" 
              onClick={handleButtonClick}
              disabled={disabled}
            >
              Select File{multiple ? 's' : ''}
            </Button>
          </div>
        </div>
        
        {/* Error messages */}
        {errors.length > 0 && (
          <div className="mt-2" aria-live="polite">
            {errors.map((error, index) => (
              <div key={index} className="flex items-center text-sm text-red-500 mt-1">
                <AlertCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* File preview */}
        {showPreview && fileList.length > 0 && (
          <div className="mt-4 space-y-2">
            {fileList.map((file, index) => (
              <div 
                key={`${file.name}-${index}`} 
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  {isImageFile(file) && fileURLs[index] ? (
                    <div className="relative w-10 h-10 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                      <img
                        src={fileURLs[index] as string}
                        alt={file.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-10 h-10 rounded bg-gray-100 flex-shrink-0">
                      <File className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-700"
                  onClick={() => handleDelete(index)}
                  disabled={disabled}
                  aria-label={`Remove file ${file.name}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;