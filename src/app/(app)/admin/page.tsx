'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Building2, Cable, Phone, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface AdminStats {
  tenants: {
    total: number
    active: number
  }
  connections: {
    total: number
    active: number
  }
  calls: {
    today: number
    total: number
  }
  jobs: {
    pending: number
    processing: number
    completed: number
    failed: number
  }
  recentActivity: Array<{
    id: string
    job_type: string
    status: string
    created_at: string
    tenants?: { name: string } | null
  }>
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatRelativeTime = (dateString: string) => {
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

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
      default:
        return <div className="h-4 w-4 rounded-full bg-yellow-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#F5F5F7]">Super Admin Dashboard</h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          System-wide overview and activity
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Total Tenants</p>
            <Building2 className="h-4 w-4 text-[#5C6370]" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[24px] font-semibold text-[#F5F5F7]">{stats?.tenants.total || 0}</p>
              <p className="text-[11px] text-[#5C6370] mt-1">
                {stats?.tenants.active || 0} active
              </p>
            </>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Connections</p>
            <Cable className="h-4 w-4 text-[#5C6370]" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[24px] font-semibold text-[#F5F5F7]">{stats?.connections.total || 0}</p>
              <p className="text-[11px] text-[#5C6370] mt-1">
                {stats?.connections.active || 0} active
              </p>
            </>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Calls Today</p>
            <Phone className="h-4 w-4 text-[#5C6370]" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[24px] font-semibold text-[#F5F5F7]">{stats?.calls.today || 0}</p>
              <p className="text-[11px] text-[#5C6370] mt-1">
                {stats?.calls.total.toLocaleString() || 0} total
              </p>
            </>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">Job Queue</p>
            <AlertCircle className="h-4 w-4 text-[#5C6370]" />
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[24px] font-semibold text-[#F5F5F7]">
                {(stats?.jobs.pending || 0) + (stats?.jobs.processing || 0)}
              </p>
              <p className="text-[11px] text-[#5C6370] mt-1">
                {stats?.jobs.failed || 0} failed
              </p>
            </>
          )}
        </div>
      </div>

      {/* Job Queue Status */}
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <h2 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Job Queue Status</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[#2E3142] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between p-4 bg-[#0F1117] rounded-lg">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase mb-1">Pending</p>
                <p className="text-[20px] font-semibold text-yellow-400">{stats?.jobs.pending || 0}</p>
              </div>
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0F1117] rounded-lg">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase mb-1">Processing</p>
                <p className="text-[20px] font-semibold text-blue-400">{stats?.jobs.processing || 0}</p>
              </div>
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0F1117] rounded-lg">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase mb-1">Completed</p>
                <p className="text-[20px] font-semibold text-green-400">{stats?.jobs.completed || 0}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0F1117] rounded-lg">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase mb-1">Failed</p>
                <p className="text-[20px] font-semibold text-red-400">{stats?.jobs.failed || 0}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#F5F5F7]">Recent Activity</h2>
          <span className="text-[11px] text-[#5C6370]">Last 10 jobs</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-[#2E3142] rounded animate-pulse" />
            ))}
          </div>
        ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-0">
            {stats.recentActivity.map((job) => {
              const tenantName = job.tenants && typeof job.tenants === 'object' && 'name' in job.tenants
                ? (job.tenants.name as string)
                : 'Unknown'

              return (
                <div
                  key={job.id}
                  className="flex items-center gap-4 py-3 border-b border-[#2E3142] last:border-0"
                >
                  <div className="flex-shrink-0">
                    {getJobStatusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#F5F5F7] truncate">
                      {tenantName}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {job.job_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={job.status} type="job_status" />
                    <span className="text-[11px] text-[#5C6370] w-16 text-right">
                      {formatRelativeTime(job.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-[13px] text-[#5C6370]">No recent activity</p>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <h2 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">System Health</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-[13px] text-[#F5F5F7]">API Status</span>
            </div>
            <span className="text-[12px] text-green-400">Operational</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-[13px] text-[#F5F5F7]">Database</span>
            </div>
            <span className="text-[12px] text-green-400">Operational</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(stats?.jobs.processing || 0) > 0 ? (
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              <span className="text-[13px] text-[#F5F5F7]">Worker</span>
            </div>
            <span className={`text-[12px] ${(stats?.jobs.processing || 0) > 0 ? 'text-blue-400' : 'text-green-400'}`}>
              {(stats?.jobs.processing || 0) > 0 ? 'Processing jobs' : 'Idle'}
            </span>
          </div>

          {stats && stats.jobs.failed > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span className="text-[13px] text-[#F5F5F7]">Failed Jobs</span>
              </div>
              <span className="text-[12px] text-yellow-400">{stats.jobs.failed} require attention</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
