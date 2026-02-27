'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, Loader2 } from 'lucide-react'
import { DataTable, Column, PaginationData } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'

interface CallAnalysis {
  sentiment_overall: string | null
  sentiment_score: number | null
}

interface Tenant {
  name: string
}

interface Call {
  id: string
  src: string
  dst: string
  call_direction: 'inbound' | 'outbound' | 'internal'
  duration_seconds: number | null
  disposition: string
  start_time: string
  processing_status: string
  call_analyses?: CallAnalysis[] | CallAnalysis | null
  tenants?: Tenant | null
}

type DateRangePreset = 'today' | '7days' | '30days' | 'custom'

export default function AdminCallsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [calls, setCalls] = useState<Call[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateRange, setDateRange] = useState<DateRangePreset>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [dispositionFilter, setDispositionFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounce, setSearchDebounce] = useState('')

  // Initialize filters from URL params
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const range = searchParams.get('range') as DateRangePreset || '30days'
    const disposition = searchParams.get('disposition') || 'all'
    const direction = searchParams.get('direction') || 'all'
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''

    setPagination(prev => ({ ...prev, page, limit }))
    setDateRange(range)
    setDispositionFilter(disposition)
    setDirectionFilter(direction)
    setSearchQuery(search)
    setSearchDebounce(search)
    setCustomStartDate(startDate)
    setCustomEndDate(endDate)
  }, [searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update URL params
  const updateURL = useCallback((params: Record<string, string | number>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        newSearchParams.set(key, String(value))
      } else {
        newSearchParams.delete(key)
      }
    })

    router.push(`?${newSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Fetch calls
  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', String(pagination.limit))

      // Add date range
      if (dateRange !== 'custom') {
        const now = new Date()
        let startDate: Date

        switch (dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7days':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 7)
            break
          case '30days':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 30)
            break
          default:
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 30)
        }

        params.set('start_date', startDate.toISOString())
      } else {
        if (customStartDate) params.set('start_date', new Date(customStartDate).toISOString())
        if (customEndDate) params.set('end_date', new Date(customEndDate).toISOString())
      }

      // Add filters
      if (dispositionFilter && dispositionFilter !== 'all') {
        params.set('disposition', dispositionFilter)
      }
      if (directionFilter && directionFilter !== 'all') {
        params.set('direction', directionFilter)
      }
      if (searchDebounce) {
        params.set('search', searchDebounce)
      }

      const response = await fetch(`/api/admin/calls?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calls')
      }

      const data = await response.json()
      setCalls(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching calls:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, dateRange, customStartDate, customEndDate, dispositionFilter, directionFilter, searchDebounce])

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  // Format duration as M:SS
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format relative date
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`
    return date.toLocaleDateString()
  }

  // Get direction icon
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'inbound':
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />
      case 'outbound':
        return <ArrowUpRight className="h-4 w-4 text-blue-400" />
      case 'internal':
        return <ArrowLeftRight className="h-4 w-4 text-gray-400" />
      default:
        return <ArrowLeftRight className="h-4 w-4 text-gray-400" />
    }
  }

  // Get sentiment
  const getSentiment = (call: Call): string | null => {
    if (!call.call_analyses) return null

    if (Array.isArray(call.call_analyses) && call.call_analyses.length > 0) {
      return call.call_analyses[0].sentiment_overall
    }

    if (typeof call.call_analyses === 'object' && 'sentiment_overall' in call.call_analyses) {
      return call.call_analyses.sentiment_overall
    }

    return null
  }

  // Define columns
  const columns: Column<Call>[] = [
    {
      key: 'tenant',
      label: 'Tenant',
      render: (call) => (
        <span className="text-[13px] text-[#9CA3AF]">
          {call.tenants?.name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'direction',
      label: '',
      align: 'center',
      render: (call) => getDirectionIcon(call.call_direction),
    },
    {
      key: 'from',
      label: 'From',
      render: (call) => (
        <span className="font-mono text-[13px] text-[#F5F5F7]">
          {call.src}
        </span>
      ),
    },
    {
      key: 'to',
      label: 'To',
      render: (call) => (
        <span className="font-mono text-[13px] text-[#F5F5F7]">
          {call.dst}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      align: 'right',
      render: (call) => (
        <span className="font-mono text-[12px] text-[#9CA3AF]">
          {formatDuration(call.duration_seconds)}
        </span>
      ),
    },
    {
      key: 'disposition',
      label: 'Disposition',
      align: 'center',
      render: (call) => <StatusBadge status={call.disposition.toLowerCase()} type="disposition" />,
    },
    {
      key: 'sentiment',
      label: 'Sentiment',
      align: 'center',
      render: (call) => {
        const sentiment = getSentiment(call)
        return sentiment ? (
          <StatusBadge status={sentiment} type="job_status" />
        ) : (
          <span className="text-[13px] text-[#5C6370]">—</span>
        )
      },
    },
    {
      key: 'date',
      label: 'Date',
      align: 'right',
      sortable: true,
      render: (call) => (
        <span
          className="text-[12px] text-[#9CA3AF]"
          title={new Date(call.start_time).toLocaleString()}
        >
          {formatRelativeDate(call.start_time)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (call) => {
        if (call.processing_status === 'processing') {
          return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        }
        return <span className="text-[13px] text-[#5C6370]">—</span>
      },
    },
  ]

  // Handle row click
  const handleRowClick = (call: Call) => {
    router.push(`/admin/calls/${call.id}`)
  }

  // Handle filter changes
  const handleDateRangeChange = (range: DateRangePreset) => {
    setDateRange(range)
    updateURL({ range, page: 1 })
  }

  const handleDispositionChange = (disposition: string) => {
    setDispositionFilter(disposition)
    updateURL({ disposition, page: 1 })
  }

  const handleDirectionChange = (direction: string) => {
    setDirectionFilter(direction)
    updateURL({ direction, page: 1 })
  }

  const handleSearchChange = (search: string) => {
    setSearchQuery(search)
    updateURL({ search, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage })
  }

  const handlePageSizeChange = (newLimit: number) => {
    updateURL({ limit: newLimit, page: 1 })
  }

  const handleCustomDateApply = () => {
    updateURL({
      range: 'custom',
      start_date: customStartDate,
      end_date: customEndDate,
      page: 1,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#F5F5F7]">All Calls</h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          View all call recordings across all tenants
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-[#9CA3AF]">Date:</label>
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value as DateRangePreset)}
            className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
            />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
            />
            <button
              onClick={handleCustomDateApply}
              className="px-3 py-1.5 bg-[#FF7F50] text-white rounded-md text-[13px] font-medium hover:bg-[#FF9970] transition-colors"
            >
              Apply
            </button>
          </>
        )}

        {/* Disposition Filter */}
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-[#9CA3AF]">Disposition:</label>
          <select
            value={dispositionFilter}
            onChange={(e) => handleDispositionChange(e.target.value)}
            className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="ANSWERED">Answered</option>
            <option value="NO ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Direction Filter */}
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-[#9CA3AF]">Direction:</label>
          <select
            value={directionFilter}
            onChange={(e) => handleDirectionChange(e.target.value)}
            className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="internal">Internal</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6370]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search phone number..."
              className="pl-9 pr-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] placeholder-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={calls}
        pagination={pagination}
        loading={loading}
        emptyMessage="No calls found"
        emptyDescription="Calls will appear here once webhooks are received"
        onRowClick={handleRowClick}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}
