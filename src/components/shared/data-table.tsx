'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  render?: (item: T) => React.ReactNode
}

export interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: PaginationData
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  onRowClick?: (item: T) => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (limit: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc' | null) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  pagination,
  loading = false,
  emptyMessage = 'No items found',
  emptyDescription = 'No results match your criteria',
  onRowClick,
  onPageChange,
  onPageSizeChange,
  onSort,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return

    let newDirection: 'asc' | 'desc' | null = 'asc'

    if (sortColumn === column.key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc'
      } else if (sortDirection === 'desc') {
        newDirection = null
      }
    }

    setSortColumn(newDirection ? column.key : null)
    setSortDirection(newDirection)

    if (onSort) {
      onSort(column.key, newDirection)
    }
  }

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null

    if (sortColumn !== column.key) {
      return <ChevronsUpDown className="h-4 w-4 text-[#5C6370]" />
    }

    if (sortDirection === 'asc') {
      return <ChevronUp className="h-4 w-4 text-[#FF7F50]" />
    }

    if (sortDirection === 'desc') {
      return <ChevronDown className="h-4 w-4 text-[#FF7F50]" />
    }

    return <ChevronsUpDown className="h-4 w-4 text-[#5C6370]" />
  }

  const getAlignClass = (align?: string) => {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[#2E3142]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider ${getAlignClass(column.align)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-[#2E3142]">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4">
                    <div className="h-4 bg-[#242736] rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center">
        <p className="text-[15px] font-medium text-[#F5F5F7]">{emptyMessage}</p>
        <p className="text-[13px] text-[#9CA3AF] mt-1">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Table */}
      <div className="w-full overflow-x-auto rounded-lg border border-[#2E3142]">
        <table className="w-full">
          <thead className="bg-[#1A1D27] border-b border-[#2E3142]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider ${getAlignClass(column.align)} ${column.sortable ? 'cursor-pointer select-none hover:text-[#F5F5F7]' : ''}`}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div className={`flex items-center gap-2 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{column.label}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[#1E2130]">
            {data.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b border-[#2E3142] hover:bg-[#242736] transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${idx === data.length - 1 ? 'border-b-0' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-4 text-[13px] text-[#F5F5F7] ${getAlignClass(column.align)}`}>
                    {column.render ? column.render(item) : (item as Record<string, unknown>)[column.key] as string}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-[13px] text-[#9CA3AF]">
            Showing{' '}
            <span className="font-medium text-[#F5F5F7]">
              {((pagination.page - 1) * pagination.limit) + 1}
            </span>
            –
            <span className="font-medium text-[#F5F5F7]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            {' '}of{' '}
            <span className="font-medium text-[#F5F5F7]">{pagination.total}</span>
            {' '}results
          </div>

          <div className="flex items-center gap-6">
            {/* Page size selector */}
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#9CA3AF]">Per page:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="h-8 px-2 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange && onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-md border border-[#2E3142] text-[#9CA3AF] hover:bg-[#242736] hover:text-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-[13px] text-[#9CA3AF] min-w-[100px] text-center">
                Page{' '}
                <span className="font-medium text-[#F5F5F7]">{pagination.page}</span>
                {' '}of{' '}
                <span className="font-medium text-[#F5F5F7]">{pagination.totalPages}</span>
              </span>

              <button
                onClick={() => onPageChange && onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-md border border-[#2E3142] text-[#9CA3AF] hover:bg-[#242736] hover:text-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
