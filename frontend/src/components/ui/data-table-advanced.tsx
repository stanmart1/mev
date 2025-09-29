import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebounce } from '../../hooks/useDebounce'

export interface Column<T> {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T, index: number) => React.ReactNode
  width?: string | number
  align?: 'left' | 'center' | 'right'
  className?: string
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  [key: string]: string
}

export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
}

interface DataTableAdvancedProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  pagination?: PaginationConfig
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSort?: (sort: SortConfig | null) => void
  onFilter?: (filters: FilterConfig) => void
  onRowClick?: (row: T, index: number) => void
  selectedRows?: T[]
  onRowSelect?: (rows: T[]) => void
  showSelection?: boolean
  showFilters?: boolean
  showPagination?: boolean
  className?: string
  emptyMessage?: string
  striped?: boolean
  hover?: boolean
  compact?: boolean
  stickyHeader?: boolean
  maxHeight?: string
  rowKey?: keyof T | ((row: T) => string)
  expandable?: {
    expandedRowRender: (row: T) => React.ReactNode
    rowExpandable?: (row: T) => boolean
  }
}

export function DataTableAdvanced<T>({
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
  onFilter,
  onRowClick,
  selectedRows = [],
  onRowSelect,
  showSelection = false,
  showFilters = false,
  showPagination = true,
  className = '',
  emptyMessage = 'No data available',
  striped = true,
  hover = true,
  compact = false,
  stickyHeader = false,
  maxHeight,
  rowKey = 'id' as keyof T,
  expandable
}: DataTableAdvancedProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [filters, setFilters] = useState<FilterConfig>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  const debouncedFilters = useDebounce(filters, 300)

  // Get row key
  const getRowKey = useCallback((row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }
    return String(row[rowKey])
  }, [rowKey])

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    const newSort: SortConfig = {
      key: columnKey,
      direction: sortConfig?.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    }
    setSortConfig(newSort)
    onSort?.(newSort)
  }, [sortConfig, onSort])

  // Handle filtering
  const handleFilter = useCallback((columnKey: string, value: string) => {
    const newFilters = { ...filters, [columnKey]: value }
    if (value === '') {
      delete newFilters[columnKey]
    }
    setFilters(newFilters)
  }, [filters])

  // Handle row selection
  const handleRowSelect = useCallback((row: T, checked: boolean) => {
    if (!onRowSelect) return

    const rowKeyValue = getRowKey(row)
    const newSelected = checked
      ? [...selectedRows, row]
      : selectedRows.filter(r => getRowKey(r) !== rowKeyValue)
    
    onRowSelect(newSelected)
  }, [selectedRows, onRowSelect, getRowKey])

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onRowSelect) return
    onRowSelect(checked ? [...data] : [])
  }, [data, onRowSelect])

  // Handle row expansion
  const handleRowExpand = useCallback((row: T) => {
    const rowKeyValue = getRowKey(row)
    const newExpanded = new Set(expandedRows)
    
    if (newExpanded.has(rowKeyValue)) {
      newExpanded.delete(rowKeyValue)
    } else {
      newExpanded.add(rowKeyValue)
    }
    
    setExpandedRows(newExpanded)
  }, [expandedRows, getRowKey])

  // Check if row is selected
  const isRowSelected = useCallback((row: T): boolean => {
    const rowKeyValue = getRowKey(row)
    return selectedRows.some(r => getRowKey(r) === rowKeyValue)
  }, [selectedRows, getRowKey])

  // Check if row is expanded
  const isRowExpanded = useCallback((row: T): boolean => {
    return expandedRows.has(getRowKey(row))
  }, [expandedRows, getRowKey])

  // Send filter updates
  useEffect(() => {
    onFilter?.(debouncedFilters)
  }, [debouncedFilters, onFilter])

  // Determine if all rows are selected
  const allRowsSelected = data.length > 0 && data.every(row => isRowSelected(row))
  const someRowsSelected = selectedRows.length > 0 && !allRowsSelected

  // Table container styles
  const containerClasses = [
    'data-table-container',
    className
  ].filter(Boolean).join(' ')

  const tableClasses = [
    'data-table',
    striped && 'striped',
    hover && 'hover',
    compact && 'compact',
    stickyHeader && 'sticky-header'
  ].filter(Boolean).join(' ')

  const containerStyle = {
    ...(maxHeight && { maxHeight, overflowY: 'auto' as const })
  }

  return (
    <div className={containerClasses} style={containerStyle}>
      {/* Table */}
      <table className={tableClasses}>
        {/* Header */}
        <thead>
          {showFilters && (
            <tr className="filter-row">
              {showSelection && (
                <th className="selection-header">
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someRowsSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox"
                  />
                </th>
              )}
              {expandable && <th className="expand-header"></th>}
              {columns.map((column) => (
                <th key={String(column.key)} className="filter-cell">
                  {column.filterable && (
                    <input
                      type="text"
                      placeholder={`Filter ${column.title}`}
                      value={String(filters[String(column.key)] || '')}
                      onChange={(e) => handleFilter(String(column.key), e.target.value)}
                      className="filter-input input"
                    />
                  )}
                </th>
              ))}
            </tr>
          )}
          
          <tr className="header-row">
            {showSelection && (
              <th className="selection-header">
                {!showFilters && (
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someRowsSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="checkbox"
                  />
                )}
              </th>
            )}
            
            {expandable && <th className="expand-header"></th>}
            
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={[
                  'header-cell',
                  column.sortable && 'sortable',
                  column.className,
                  `align-${column.align || 'left'}`
                ].filter(Boolean).join(' ')}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(String(column.key))}
              >
                <div className="header-content">
                  <span className="header-title">{column.title}</span>
                  {column.sortable && (
                    <span className="sort-indicator">
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                      ) : ' ↕'}
                    </span>
                  )}

                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td 
                colSpan={
                  columns.length + 
                  (showSelection ? 1 : 0) + 
                  (expandable ? 1 : 0)
                }
                className="loading-cell text-center py-4"
              >
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                  Loading...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td 
                colSpan={
                  columns.length + 
                  (showSelection ? 1 : 0) + 
                  (expandable ? 1 : 0)
                }
                className="empty-cell text-center py-8"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <React.Fragment key={getRowKey(row)}>
                <tr
                  className={[
                    'data-row',
                    isRowSelected(row) && 'selected',
                    onRowClick && 'clickable'
                  ].filter(Boolean).join(' ')}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {showSelection && (
                    <td className="selection-cell">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleRowSelect(row, e.target.checked)
                        }}
                        className="checkbox"
                      />
                    </td>
                  )}
                  
                  {expandable && (
                    <td className="expand-cell">
                      {(!expandable.rowExpandable || expandable.rowExpandable(row)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRowExpand(row)
                          }}
                          className="expand-button button button-ghost button-sm"
                        >
                          {isRowExpanded(row) ? '−' : '+'}
                        </button>
                      )}
                    </td>
                  )}
                  
                  {columns.map((column) => {
                    const value = column.key.includes('.') 
                      ? column.key.split('.').reduce((obj: any, key: string) => obj?.[key], row)
                      : (row as any)[column.key]
                    
                    return (
                      <td
                        key={String(column.key)}
                        className={[
                          'data-cell',
                          column.className,
                          `align-${column.align || 'left'}`
                        ].filter(Boolean).join(' ')}
                      >
                        {column.render ? column.render(value, row, index) : String(value || '')}
                      </td>
                    )
                  })}
                </tr>
                
                {/* Expanded row content */}
                {expandable && isRowExpanded(row) && (
                  <tr className="expanded-row">
                    <td 
                      colSpan={
                        columns.length + 
                        (showSelection ? 1 : 0) + 
                        (expandable ? 1 : 0)
                      }
                      className="expanded-cell"
                    >
                      {expandable.expandedRowRender(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {showPagination && pagination && (
        <div className="pagination-container flex items-center justify-between py-4">
          <div className="pagination-info text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} entries
          </div>
          
          <div className="pagination-controls flex items-center space-x-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="page-size-select input"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="pagination-button button button-outline button-sm"
            >
              Previous
            </button>
            
            <span className="page-info text-sm">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="pagination-button button button-outline button-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}