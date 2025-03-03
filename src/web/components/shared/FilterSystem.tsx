import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import clsx from 'clsx'; // v1.2.1
import Slider from '@radix-ui/react-slider'; // v1.1.2

import { Button } from '../ui/Button';
import Input from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/RadioGroup';
import Badge from '../ui/Badge';
import { DatePicker } from '../ui/DatePicker';
import useDebounce from '../../hooks/useDebounce';
import useLocalStorage from '../../hooks/useLocalStorage';
import { cn } from '../../lib/utils';

/**
 * Enum of supported filter input types
 */
export enum FilterType {
  TEXT = 'text',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  RANGE = 'range',
  DATE = 'date',
  DATE_RANGE = 'dateRange'
}

/**
 * Defines a single filter option configuration
 */
export interface FilterOption {
  id: string;
  label: string;
  type: FilterType;
  options?: any[];
  defaultValue?: any;
  isMulti?: boolean;
  validation?: object;
  placeholder?: string;
  helpText?: string;
  groupName?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Group of related filters
 */
export interface FilterGroup {
  id: string;
  label: string;
  filters: FilterOption[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Represents the current value of a filter
 */
export interface FilterValue {
  id: string;
  value: any;
  displayValue?: string;
}

/**
 * Props for the FilterSystem component
 */
export interface FilterSystemProps {
  filters: FilterOption[] | FilterGroup[];
  onChange: (filters: FilterValue[]) => void;
  initialValues?: Record<string, any>;
  showApplyButton?: boolean;
  showClearButton?: boolean;
  showSaveButton?: boolean;
  showActiveBadges?: boolean;
  savePreferenceKey?: string;
  className?: string;
  children?: ReactNode;
  layout?: 'horizontal' | 'vertical' | 'grid';
  autoSubmit?: boolean;
  debounceMs?: number;
}

/**
 * Renders the appropriate filter input component based on filter type
 */
const renderFilterInput = (filter: FilterOption, value: any, onChange: (value: any) => void) => {
  const { type, id, label, placeholder, options, isMulti, min, max, step, helpText } = filter;
  
  switch (type) {
    case FilterType.TEXT:
      return (
        <Input
          id={id}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
      );
      
    case FilterType.SELECT:
      return (
        <Select 
          value={String(value || '')}
          onValueChange={onChange}
        >
          <SelectTrigger id={id} aria-label={label}>
            <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem 
                key={option.value} 
                value={String(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      
    case FilterType.CHECKBOX:
      return (
        <div className="space-y-2">
          {options?.map((option) => {
            const isChecked = Array.isArray(value) 
              ? value.includes(option.value)
              : value === option.value;
              
            return (
              <Checkbox
                key={option.value}
                id={`${id}-${option.value}`}
                label={option.label}
                checked={isChecked}
                onCheckedChange={(checked) => {
                  if (isMulti) {
                    const newValue = Array.isArray(value) ? [...value] : [];
                    if (checked) {
                      newValue.push(option.value);
                    } else {
                      const index = newValue.indexOf(option.value);
                      if (index !== -1) {
                        newValue.splice(index, 1);
                      }
                    }
                    onChange(newValue);
                  } else {
                    onChange(checked ? option.value : null);
                  }
                }}
              />
            );
          })}
        </div>
      );
      
    case FilterType.RADIO:
      return (
        <RadioGroup
          value={String(value || '')}
          onValueChange={onChange}
        >
          {options?.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem 
                id={`${id}-${option.value}`} 
                value={String(option.value)} 
              />
              <label htmlFor={`${id}-${option.value}`} className="text-sm">
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      );
      
    case FilterType.RANGE:
      return (
        <div className="space-y-2">
          <Slider
            value={[value !== undefined ? value : min || 0]}
            min={min || 0}
            max={max || 100}
            step={step || 1}
            onValueChange={(values) => onChange(values[0])}
            aria-label={label}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{min || 0}</span>
            <span>{max || 100}</span>
          </div>
          {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
        </div>
      );
      
    case FilterType.DATE:
      return (
        <DatePicker
          date={value ? new Date(value) : undefined}
          onDateChange={(date) => onChange(date ? date.toISOString() : null)}
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
          aria-label={label}
        />
      );
      
    case FilterType.DATE_RANGE:
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              date={value?.from ? new Date(value.from) : undefined}
              onDateChange={(date) => 
                onChange({ ...value, from: date ? date.toISOString() : null })
              }
              placeholder="From"
              aria-label={`${label} from`}
            />
            <DatePicker
              date={value?.to ? new Date(value.to) : undefined}
              onDateChange={(date) => 
                onChange({ ...value, to: date ? date.toISOString() : null })
              }
              placeholder="To"
              aria-label={`${label} to`}
            />
          </div>
          {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
        </div>
      );
      
    default:
      return null;
  }
};

/**
 * A flexible filtering system component that can be configured with different filter types and layouts.
 * Supports various filter types including text, select, checkbox, radio, range, and date filters.
 * Can be organized into filter groups with collapsible sections.
 */
const FilterSystem: React.FC<FilterSystemProps> = ({
  filters,
  onChange,
  initialValues = {},
  showApplyButton = true,
  showClearButton = true,
  showSaveButton = false,
  showActiveBadges = true,
  savePreferenceKey,
  className,
  children,
  layout = 'vertical',
  autoSubmit = false,
  debounceMs = 300,
}) => {
  // State for current filter values
  const [filterValues, setFilterValues] = useState<Record<string, any>>(initialValues);
  // Debounced values for auto-submit
  const debouncedValues = useDebounce(filterValues, debounceMs);
  // Track if filters are dirty (changed since last apply)
  const [isFiltersDirty, setIsFiltersDirty] = useState(false);
  // Track expanded state of filter groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Initialize saved preferences if available
  const [savedPreferences, setSavedPreferences] = useLocalStorage<Record<string, any>>(
    savePreferenceKey || 'filter-preferences',
    {}
  );
  
  // Flatten filters if they are in groups
  const flattenedFilters = useMemo(() => {
    let flat: FilterOption[] = [];
    
    if (filters.length === 0) {
      return flat;
    }
    
    // Check if we have filter groups or just filters
    if ('filters' in filters[0]) {
      // Initialize expanded state for groups
      const initialExpandedState: Record<string, boolean> = {};
      
      (filters as FilterGroup[]).forEach((group) => {
        flat = [...flat, ...group.filters];
        
        // Set default expanded state
        if (expandedGroups[group.id] === undefined && group.defaultExpanded !== false) {
          initialExpandedState[group.id] = true;
        }
      });
      
      // Update expanded groups state with defaults
      if (Object.keys(initialExpandedState).length > 0) {
        setExpandedGroups((prev) => ({
          ...prev,
          ...initialExpandedState,
        }));
      }
    } else {
      flat = filters as FilterOption[];
    }
    
    return flat;
  }, [filters, expandedGroups]);
  
  // Get active filters in a normalized format
  const activeFilters = useMemo(() => {
    return Object.entries(filterValues)
      .filter(([_, value]) => {
        // Filter out empty values
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return false;
        return true;
      })
      .map(([id, value]) => {
        const filter = flattenedFilters.find((f) => f.id === id);
        return {
          id,
          value,
          displayValue: getDisplayValue(id, value),
        };
      });
  }, [filterValues, flattenedFilters]);
  
  // Effect to initialize from saved preferences
  useEffect(() => {
    if (savePreferenceKey && savedPreferences[savePreferenceKey]) {
      setFilterValues((prev) => ({
        ...prev,
        ...savedPreferences[savePreferenceKey],
      }));
    }
  }, [savePreferenceKey, savedPreferences]);
  
  // Effect to auto-submit when values change (if enabled)
  useEffect(() => {
    if (autoSubmit) {
      handleApplyFilters();
    }
  }, [debouncedValues]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Apply initial values
  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFilterValues(initialValues);
      if (autoSubmit) {
        onChange(
          Object.entries(initialValues).map(([id, value]) => ({
            id,
            value,
            displayValue: getDisplayValue(id, value),
          }))
        );
      }
    }
  }, [initialValues]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle individual filter changes
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterId]: value,
    }));
    setIsFiltersDirty(true);
  }, []);
  
  // Apply all filters
  const handleApplyFilters = useCallback(() => {
    onChange(activeFilters);
    setIsFiltersDirty(false);
  }, [onChange, activeFilters]);
  
  // Clear all filters
  const handleClearFilters = useCallback(() => {
    // Reset to default values or empty
    const defaults: Record<string, any> = {};
    
    flattenedFilters.forEach((filter) => {
      if (filter.defaultValue !== undefined) {
        defaults[filter.id] = filter.defaultValue;
      }
    });
    
    setFilterValues(defaults);
    setIsFiltersDirty(true);
    
    // If auto-submit, trigger onChange immediately
    if (autoSubmit) {
      onChange(
        Object.entries(defaults).map(([id, value]) => ({
          id,
          value,
          displayValue: getDisplayValue(id, value),
        }))
      );
    }
  }, [flattenedFilters, onChange, autoSubmit]);
  
  // Save current filters as preferences
  const handleSavePreferences = useCallback(() => {
    if (savePreferenceKey) {
      setSavedPreferences((prev) => ({
        ...prev,
        [savePreferenceKey]: filterValues,
      }));
    }
  }, [savePreferenceKey, filterValues, setSavedPreferences]);
  
  // Remove a single filter
  const handleRemoveFilter = useCallback((filterId: string) => {
    setFilterValues((prev) => {
      const newValues = { ...prev };
      
      // Get the filter to find its default value
      const filter = flattenedFilters.find((f) => f.id === filterId);
      
      if (filter?.defaultValue !== undefined) {
        newValues[filterId] = filter.defaultValue;
      } else {
        delete newValues[filterId];
      }
      
      return newValues;
    });
    setIsFiltersDirty(true);
    
    // If auto-submit, apply immediately
    if (autoSubmit) {
      // Need to calculate the new active filters here
      setTimeout(() => handleApplyFilters(), 0);
    }
  }, [flattenedFilters, autoSubmit, handleApplyFilters]);
  
  // Toggle filter group expansion
  const toggleFilterGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);
  
  // Helper to get display value for a filter
  const getDisplayValue = (filterId: string, value: any): string => {
    const filter = flattenedFilters.find((f) => f.id === filterId);
    
    if (!filter) return String(value);
    
    switch (filter.type) {
      case FilterType.SELECT:
      case FilterType.RADIO:
        const option = filter.options?.find((o) => String(o.value) === String(value));
        return option?.label || String(value);
        
      case FilterType.CHECKBOX:
        if (Array.isArray(value)) {
          return value
            .map((v) => {
              const option = filter.options?.find((o) => o.value === v);
              return option?.label || String(v);
            })
            .join(', ');
        }
        return String(value);
        
      case FilterType.RANGE:
        return `${value}${filter.helpText ? ' ' + filter.helpText : ''}`;
        
      case FilterType.DATE:
        return value ? new Date(value).toLocaleDateString() : '';
        
      case FilterType.DATE_RANGE:
        const from = value.from ? new Date(value.from).toLocaleDateString() : '';
        const to = value.to ? new Date(value.to).toLocaleDateString() : '';
        return from || to ? `${from} - ${to}` : '';
        
      default:
        return String(value);
    }
  };
  
  // Render layout class based on layout prop
  const layoutClass = useMemo(() => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-row flex-wrap gap-4';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      case 'vertical':
      default:
        return 'flex flex-col gap-4';
    }
  }, [layout]);
  
  return (
    <div className={cn('filter-system', className)}>
      {/* Filter Form */}
      <div className={layoutClass}>
        {/* Render filter groups or individual filters */}
        {filters.length > 0 &&
          ('filters' in filters[0] ? (
            // Render filter groups
            (filters as FilterGroup[]).map((group) => (
              <div
                key={group.id}
                className={cn('filter-group border rounded-lg overflow-hidden', {
                  'border-gray-200': !group.collapsible,
                  'border-gray-300': group.collapsible,
                })}
              >
                {/* Group header */}
                <div
                  className={cn('px-4 py-2 bg-gray-50 flex justify-between items-center', {
                    'cursor-pointer': group.collapsible,
                  })}
                  onClick={() => group.collapsible && toggleFilterGroup(group.id)}
                >
                  <h3 className="font-medium text-sm">{group.label}</h3>
                  {group.collapsible && (
                    <span className="text-gray-500">
                      {expandedGroups[group.id] ? '−' : '+'}
                    </span>
                  )}
                </div>
                
                {/* Group content */}
                {(!group.collapsible || expandedGroups[group.id]) && (
                  <div className="p-4 space-y-4">
                    {group.filters.map((filter) => (
                      <div key={filter.id} className="filter-item space-y-1">
                        <label
                          htmlFor={filter.id}
                          className="block text-sm font-medium text-gray-700"
                        >
                          {filter.label}
                        </label>
                        {renderFilterInput(
                          filter,
                          filterValues[filter.id],
                          (value) => handleFilterChange(filter.id, value)
                        )}
                        {filter.helpText && !filter.type.includes('range') && (
                          <p className="text-xs text-gray-500">{filter.helpText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            // Render individual filters
            (filters as FilterOption[]).map((filter) => (
              <div key={filter.id} className="filter-item space-y-1">
                <label
                  htmlFor={filter.id}
                  className="block text-sm font-medium text-gray-700"
                >
                  {filter.label}
                </label>
                {renderFilterInput(
                  filter,
                  filterValues[filter.id],
                  (value) => handleFilterChange(filter.id, value)
                )}
                {filter.helpText && !filter.type.includes('range') && (
                  <p className="text-xs text-gray-500">{filter.helpText}</p>
                )}
              </div>
            ))
          ))}
          
        {/* Custom children */}
        {children}
      </div>
      
      {/* Active Filters Display */}
      {showActiveBadges && activeFilters.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant="outline"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span>
                  {flattenedFilters.find((f) => f.id === filter.id)?.label}: {filter.displayValue}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  aria-label={`Remove ${filter.id} filter`}
                >
                  ×
                </button>
              </Badge>
            ))}
            {activeFilters.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Filter Actions */}
      {(showApplyButton || showClearButton || showSaveButton) && (
        <div className="mt-4 flex items-center gap-2">
          {showApplyButton && !autoSubmit && (
            <Button
              type="button"
              onClick={handleApplyFilters}
              disabled={!isFiltersDirty}
            >
              Apply Filters
            </Button>
          )}
          
          {showClearButton && !showActiveBadges && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              disabled={activeFilters.length === 0}
            >
              Clear Filters
            </Button>
          )}
          
          {showSaveButton && savePreferenceKey && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSavePreferences}
              disabled={activeFilters.length === 0}
            >
              Save Preferences
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterSystem;