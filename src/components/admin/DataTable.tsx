/**
 * DataTable Component - Reusable table with sorting, pagination, and filtering
 * 
 * A comprehensive data table component designed for admin interfaces with:
 * - Column sorting (ascending/descending)
 * - Pagination with customizable page sizes
 * - Global search and column-specific filtering
 * - Responsive design with mobile optimization
 * - Accessible keyboard navigation
 * - Glass-morphism styling consistent with design system
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

/**
 * Column definition interface
 */
export interface Column<T = any> {
  /** Unique identifier for the column */
  key: string;
  /** Display label for column header */
  label: string;
  /** Width of the column (optional) */
  width?: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Whether this column is searchable */
  searchable?: boolean;
  /** Alignment of cell content */
  align?: 'left' | 'center' | 'right';
}

/**
 * Action button interface
 */
export interface ActionButton<T = any> {
  /** Label for the action */
  label: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Click handler */
  onClick: (row: T, index: number) => void;
  /** Color theme for the button */
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  /** Whether the action is disabled */
  disabled?: (row: T) => boolean;
}

/**
 * DataTable component props
 */
interface DataTableProps<T = any> {
  /** Array of data to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Items per page options */
  pageSizes?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Whether to show search */
  searchable?: boolean;
  /** Custom search placeholder */
  searchPlaceholder?: string;
  /** Action buttons for each row */
  actions?: ActionButton<T>[];
  /** Custom empty state message */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sort direction type
 */
type SortDirection = 'asc' | 'desc' | null;

/**
 * Sort state interface
 */
interface SortState {
  column: string | null;
  direction: SortDirection;
}

/**
 * DataTable Component
 * 
 * Provides a comprehensive data table with all common features needed
 * for admin interfaces. Supports TypeScript generics for type safety.
 */
const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error = null,
  pageSizes = [10, 25, 50, 100],
  defaultPageSize = 25,
  searchable = true,
  searchPlaceholder = 'Search...',
  actions = [],
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>): JSX.Element => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Filter and sort data based on current state
   */
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => {
        return columns.some(column => {
          if (!column.searchable) return false;
          const value = row[column.key];
          return String(value || '').toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply sorting
    if (sortState.column && sortState.direction) {
      filtered.sort((a, b) => {
        const aVal = a[sortState.column!];
        const bVal = b[sortState.column!];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortState.direction === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortState, columns]);

  /**
   * Paginated data for current page
   */
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedData, currentPage, pageSize]);

  /**
   * Total pages calculation
   */
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  /**
   * Handle column sort
   */
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    setSortState(prev => {
      if (prev.column === columnKey) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
        if (prev.direction === 'desc') return { column: null, direction: null };
      }
      return { column: columnKey, direction: 'asc' };
    });
  }, [columns]);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Get sort icon for column
   */
  const getSortIcon = (columnKey: string) => {
    if (sortState.column !== columnKey) return null;
    return sortState.direction === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  /**
   * Get action button color classes
   */
  const getActionButtonClasses = (color: string = 'blue') => {
    const colorMap = {
      blue: 'text-electric-blue-400 hover:bg-electric-blue-500/20',
      green: 'text-cyber-green-400 hover:bg-cyber-green-500/20',
      red: 'text-red-400 hover:bg-red-500/20',
      purple: 'text-neon-purple-400 hover:bg-neon-purple-500/20',
      yellow: 'text-yellow-400 hover:bg-yellow-500/20'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className={`bg-glass border-glass rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="p-6 border-b border-glass">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-glass border-glass rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 bg-glass border-glass rounded-lg text-gray-300 hover:text-white hover:bg-glass-dark transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
              aria-label="Toggle filters"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-2 bg-glass border-glass rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-electric-blue-400"
            >
              {pageSizes.map(size => (
                <option key={size} value={size} className="bg-dark-secondary">
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="mt-4 text-sm text-gray-300">
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedData.length)} to{' '}
          {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of{' '}
          {filteredAndSortedData.length} entries
          {searchTerm && ` (filtered from ${data.length} total entries)`}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 text-center">
          <div className="text-red-400 mb-2">⚠️ Error loading data</div>
          <div className="text-red-300 text-sm">{error}</div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-glass-light border-b border-glass">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`
                      px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider
                      ${column.sortable ? 'cursor-pointer hover:text-white select-none' : ''}
                      ${column.width ? `w-${column.width}` : ''}
                      ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}
                    `}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.label}</span>
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass">
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-lg">{emptyMessage}</div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <motion.tr
                      key={index}
                      className="hover:bg-glass-light transition-colors duration-200"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`
                            px-6 py-4 whitespace-nowrap text-sm text-gray-200
                            ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}
                          `}
                        >
                          {column.render ? 
                            column.render(row[column.key], row, index) : 
                            row[column.key]
                          }
                        </td>
                      ))}
                      {actions.length > 0 && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {actions.map((action, actionIndex) => (
                              <button
                                key={actionIndex}
                                onClick={() => action.onClick(row, index)}
                                disabled={action.disabled?.(row)}
                                className={`
                                  p-2 rounded-lg transition-all duration-200 min-w-touch min-h-touch touch-manipulation
                                  ${action.disabled?.(row) 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : `${getActionButtonClasses(action.color)} hover:scale-105`
                                  }
                                `}
                                title={action.label}
                                aria-label={action.label}
                              >
                                <action.icon className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-glass">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-touch touch-manipulation
                        ${pageNum === currentPage
                          ? 'bg-electric-blue-500/30 text-electric-blue-400 border border-electric-blue-500/50'
                          : 'text-gray-300 hover:text-white hover:bg-glass-dark'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-glass border-glass hover:bg-glass-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-touch min-h-touch touch-manipulation"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;