import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'; // v0.279.0
import { cn } from '../../lib/utils';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/Table';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

// Type definitions
type SortDirection = 'asc' | 'desc';

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';

interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: any;
}

interface ColumnDefinition {
  key: string;
  header: string;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  cell?: (row: any) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

interface DataTableProps {
  data: any[];
  columns: ColumnDefinition[];
  pageSize?: number;
  pageSizeOptions?: number[];
  initialSortColumn?: string;
  initialSortDirection?: SortDirection;
  searchable?: boolean;
  searchableFields?: string[];
  selectable?: boolean;
  onRowSelect?: (selectedIds: (string | number)[]) => void;
  onRowClick?: (row: any) => void;
  filters?: FilterConfig[];
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
}

interface DataTableState {
  currentPage: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: SortDirection;
  searchQuery: string;
  selectedRows: Set<string | number>;
  processedData: any[];
  activeFilters: FilterConfig[];
}

// Helper functions
function sortData(data: any[], sortKey: string, direction: SortDirection): any[] {
  if (!sortKey) return data;
  
  const sortedData = [...data];
  
  return sortedData.sort((a, b) => {
    const aValue = sortKey.split('.').reduce((obj, key) => obj && obj[key], a);
    const bValue = sortKey.split('.').reduce((obj, key) => obj && obj[key], b);
    
    // Handle undefined/null values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return direction === 'asc' ? -1 : 1;
    if (bValue == null) return direction === 'asc' ? 1 : -1;
    
    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return direction === 'asc' 
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }
    
    // Handle numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // Handle strings (default case)
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();
    
    return direction === 'asc'
      ? aString.localeCompare(bString)
      : bString.localeCompare(aString);
  });
}

function filterData(data: any[], filters: FilterConfig[]): any[] {
  if (!filters || filters.length === 0) return data;
  
  return data.filter(item => {
    // Item must pass all filters
    return filters.every(filter => {
      const { field, operator, value } = filter;
      const itemValue = field.split('.').reduce((obj, key) => obj && obj[key], item);
      
      // Skip this filter if item doesn't have the field
      if (itemValue === undefined) return true;
      
      // Apply the appropriate comparison based on operator
      switch (operator) {
        case 'eq': // equals
          return itemValue === value;
        case 'neq': // not equals
          return itemValue !== value;
        case 'gt': // greater than
          return itemValue > value;
        case 'gte': // greater than or equal
          return itemValue >= value;
        case 'lt': // less than
          return itemValue < value;
        case 'lte': // less than or equal
          return itemValue <= value;
        case 'contains': // string contains
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        case 'startsWith': // string starts with
          return String(itemValue).toLowerCase().startsWith(String(value).toLowerCase());
        case 'endsWith': // string ends with
          return String(itemValue).toLowerCase().endsWith(String(value).toLowerCase());
        default:
          return true;
      }
    });
  });
}

function paginateData(data: any[], page: number, pageSize: number): any[] {
  const startIndex = (page - 1) * pageSize;
  return data.slice(startIndex, startIndex + pageSize);
}

function searchData(data: any[], query: string, searchableFields: string[]): any[] {
  if (!query || !searchableFields || searchableFields.length === 0) return data;
  
  const lowerCaseQuery = query.toLowerCase();
  
  return data.filter(item => {
    return searchableFields.some(field => {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], item);
      return value != null && String(value).toLowerCase().includes(lowerCaseQuery);
    });
  });
}

// Internal Components
const TablePagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  totalItems
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Items per page:</span>
        <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-16">
            <SelectValue>{pageSize}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>
          {totalItems === 0 
            ? 'No items' 
            : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalItems)} of ${totalItems}`}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TableSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Search..." }) => {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 h-9"
      />
    </div>
  );
};

const TableSortHeader: React.FC<{
  column: ColumnDefinition;
  activeSort: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
}> = ({ column, activeSort, direction, onSort }) => {
  const isActive = activeSort === column.key;
  
  if (!column.sortable) {
    return <span className="font-medium">{column.header}</span>;
  }
  
  return (
    <button
      className={cn(
        "flex items-center space-x-1 font-medium",
        isActive && "text-primary"
      )}
      onClick={() => onSort(column.key)}
      aria-label={`Sort by ${column.header} ${isActive && direction === 'asc' ? 'descending' : 'ascending'}`}
    >
      <span>{column.header}</span>
      {isActive ? (
        direction === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );
};

// DataTable Hook
const useDataTable = (props: DataTableProps) => {
  const {
    data = [],
    columns,
    pageSize: initialPageSize = 10,
    pageSizeOptions = [5, 10, 25, 50],
    initialSortColumn,
    initialSortDirection = 'asc',
    searchable = false,
    searchableFields = [],
    selectable = false,
    filters = [],
    onRowSelect,
  } = props;

  // State for the table
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortColumn, setSortColumn] = useState<string | null>(initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>(filters);

  // Effect to reset page when data, filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, activeFilters, searchQuery]);

  // Effect to update active filters when filters prop changes
  useEffect(() => {
    setActiveFilters(filters);
  }, [filters]);

  // Process data with search, filter, sort and pagination
  const processedData = useMemo(() => {
    // Apply search
    let result = searchable && searchQuery
      ? searchData(data, searchQuery, searchableFields)
      : [...data];
    
    // Apply filters
    result = filterData(result, activeFilters);
    
    // Apply sorting
    if (sortColumn) {
      result = sortData(result, sortColumn, sortDirection);
    }
    
    return result;
  }, [data, searchQuery, searchable, searchableFields, activeFilters, sortColumn, sortDirection]);

  // Calculate pagination information
  const totalItems = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    return paginateData(processedData, currentPage, pageSize);
  }, [processedData, currentPage, pageSize]);

  // Handle sort change
  const handleSort = (key: string) => {
    if (sortColumn === key) {
      // Toggle direction if already sorting by this column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column and reset to ascending
      setSortColumn(key);
      setSortDirection('asc');
    }
    // Reset to first page when sort changes
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    // Reset to first page and adjust for new page size
    setCurrentPage(1);
  };

  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle row selection
  const handleRowSelect = (id: string | number, selected: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (selected) {
      newSelectedRows.add(id);
    } else {
      newSelectedRows.delete(id);
    }
    setSelectedRows(newSelectedRows);
    onRowSelect?.(Array.from(newSelectedRows));
  };

  // Handle row click
  const handleRowClick = (row: any) => {
    props.onRowClick?.(row);
  };

  // Handle select all rows
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = paginatedData.map(row => row.id || paginatedData.indexOf(row));
      setSelectedRows(new Set(allIds));
      onRowSelect?.(allIds);
    } else {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    }
  };

  // Determine if all current page rows are selected
  const allSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every(row => selectedRows.has(row.id || paginatedData.indexOf(row)));
  }, [paginatedData, selectedRows]);

  // Determine if some rows are selected
  const someSelected = useMemo(() => {
    return selectedRows.size > 0 && !allSelected;
  }, [selectedRows, allSelected]);

  return {
    // State
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    searchQuery,
    selectedRows,
    activeFilters,
    processedData,
    paginatedData,
    totalItems,
    totalPages,
    allSelected,
    someSelected,
    
    // Handlers
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    handleRowSelect,
    handleRowClick,
    handleSelectAll,
  };
};

// DataTable Component
const DataTable: React.FC<DataTableProps> = (props) => {
  const {
    columns,
    className,
    loading = false,
    loadingMessage = 'Loading data...',
    emptyMessage = 'No data available',
    searchable = false,
    selectable = false,
    pageSizeOptions = [5, 10, 25, 50],
  } = props;
  
  const {
    currentPage,
    pageSize,
    sortColumn,
    sortDirection,
    searchQuery,
    selectedRows,
    paginatedData,
    totalItems,
    totalPages,
    allSelected,
    someSelected,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    handleRowSelect,
    handleRowClick,
    handleSelectAll,
  } = useDataTable(props);

  // Render loading state
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex justify-center items-center h-40">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if we should show empty state
  const showEmptyState = !loading && paginatedData.length === 0;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Table controls */}
      {searchable && (
        <div className="flex justify-between items-center pb-2">
          <div className="flex-1">
            <TableSearch
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search..."
            />
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => input && (input.indeterminate = someSelected && !allSelected)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all rows"
                    className="h-4 w-4"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  style={{ width: column.width || 'auto' }}
                  className={cn("group", column.headerClassName)}
                >
                  <TableSortHeader
                    column={column}
                    activeSort={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showEmptyState ? (
              <TableRow>
                <TableCell
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  className="h-40 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowId = row.id || rowIndex;
                return (
                  <TableRow 
                    key={rowId}
                    className={cn(
                      props.onRowClick && "cursor-pointer",
                      selectedRows.has(rowId) && "bg-muted"
                    )}
                    onClick={() => props.onRowClick && handleRowClick(row)}
                    data-state={selectedRows.has(rowId) ? "selected" : undefined}
                  >
                    {selectable && (
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(rowId)}
                          onChange={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleRowSelect(rowId, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()} // Prevent row click
                          aria-label={`Select row ${rowIndex + 1}`}
                          className="h-4 w-4"
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell 
                        key={`${rowId}-${column.key}`}
                        className={column.className}
                      >
                        {column.cell ? column.cell(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination - always show for consistent UI, even when empty */}
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={handlePageSizeChange}
        totalItems={totalItems}
      />
    </div>
  );
};

export default DataTable;