'use client'

import { useState, useEffect } from 'react'
import { RotateCcw, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, Column, PaginationData } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'

interface Job {
  id: string
  tenant_id: string
  tenants?: { name: string }
  cdr_record_id: string
  job_type: 'full_pipeline' | 'transcribe_only' | 'analyze_only'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  priority: number
  attempts: number
  max_attempts: number
  scheduled_for: string
  started_at: string | null
  completed_at: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)

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

  // Retry job
  const handleRetryJob = async (jobId: string) => {
    setRetryingIds((prev) => new Set(prev).add(jobId))

    try {
      const response = await fetch(`/api/jobs/${jobId}/retry`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Job retry initiated')
        // Refresh jobs list
        fetchJobs(pagination.page, pagination.limit, statusFilter)
      } else {
        const data = await response.json()
        const errorMessage = data.error || 'Failed to retry job'
        toast.error(errorMessage)
        console.error('Failed to retry job:', data.error)
      }
    } catch (error) {
      toast.error('Failed to retry job')
      console.error('Error retrying job:', error)
    } finally {
      setRetryingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(jobId)
        return newSet
      })
    }
  }

  // Define columns
  const columns: Column<Job>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (job) => (
        <span className="font-mono text-[12px] text-[#9CA3AF]">
          {job.id.substring(0, 8)}
        </span>
      ),
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (job) => (
        <span className="text-[13px] text-[#F5F5F7]">
          {job.tenants?.name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'job_type',
      label: 'Type',
      align: 'center',
      render: (job) => <StatusBadge status={job.job_type} type="job_type" />,
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (job) => (
        <div className="flex items-center justify-center gap-2">
          <StatusBadge status={job.status} type="job_status" />
          {job.status === 'processing' && (
            <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          )}
        </div>
      ),
    },
    {
      key: 'attempts',
      label: 'Attempts',
      align: 'center',
      render: (job) => (
        <span className="font-mono text-[12px] text-[#9CA3AF]">
          {job.attempts}/{job.max_attempts}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      align: 'right',
      sortable: true,
      render: (job) => (
        <span
          className="text-[13px] text-[#9CA3AF]"
          title={new Date(job.created_at).toLocaleString()}
        >
          {formatRelativeDate(job.created_at)}
        </span>
      ),
    },
    {
      key: 'error',
      label: 'Error',
      render: (job) => (
        job.error ? (
          <span
            className="text-[12px] text-red-400 truncate max-w-[200px] block"
            title={job.error}
          >
            {job.error}
          </span>
        ) : (
          <span className="text-[13px] text-[#5C6370]">—</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (job) => {
        const isRetrying = retryingIds.has(job.id)

        if (job.status !== 'failed') {
          return <span className="text-[13px] text-[#5C6370]">—</span>
        }

        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRetryJob(job.id)
            }}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium border border-[#2E3142] rounded-md hover:bg-[#242736] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            <span className="text-[#9CA3AF]">
              {isRetrying ? 'Retrying...' : 'Retry'}
            </span>
          </button>
        )
      },
    },
  ]

  // Fetch jobs
  const fetchJobs = async (page = pagination.page, limit = pagination.limit, status = statusFilter) => {
    setLoading(true)
    try {
      let url = `/api/jobs?page=${page}&limit=${limit}`
      if (status && status !== 'all') {
        url += `&status=${status}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const data = await response.json()
      setJobs(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchJobs()
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchJobs(pagination.page, pagination.limit, statusFilter)
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, pagination.page, pagination.limit, statusFilter])

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    fetchJobs(1, pagination.limit, newStatus)
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchJobs(newPage, pagination.limit, statusFilter)
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    fetchJobs(1, newLimit, statusFilter)
  }

  // Handle row click
  const handleRowClick = (job: Job) => {
    // TODO: Navigate to job detail page or expand inline
    console.log('Clicked job:', job)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F7]">Background Jobs</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Monitor processing pipeline jobs across all tenants
          </p>
        </div>

        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#2E3142] rounded-full peer peer-checked:bg-[#FF7F50] transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-[13px] text-[#9CA3AF]">
              Auto-refresh (10s)
            </span>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-[#9CA3AF]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-1.5 bg-[#1A1D27] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={jobs}
        pagination={pagination}
        loading={loading}
        emptyMessage="No jobs found"
        emptyDescription="Jobs will appear here when webhooks are received"
        onRowClick={handleRowClick}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  )
}
