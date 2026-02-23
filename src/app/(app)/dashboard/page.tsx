'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { CallVolumeChart } from '@/components/dashboard/call-volume-chart'
import { SentimentBreakdownChart } from '@/components/dashboard/sentiment-breakdown-chart'
import { RecentCallsList } from '@/components/dashboard/recent-calls-list'

interface DashboardStats {
  callsToday: number
  callsTodayTrend: number
  callsThisMonth: number
  callsThisMonthTrend: number
  avgDuration: number
  sentimentScore: number
  sentimentBreakdown: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
}

interface CallVolumeData {
  date: string
  count: number
}

interface Call {
  id: string
  src: string
  dst: string
  call_direction: 'inbound' | 'outbound' | 'internal'
  duration_seconds: number | null
  start_time: string
  call_analyses?: any
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [callVolume, setCallVolume] = useState<CallVolumeData[]>([])
  const [recentCalls, setRecentCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch all data in parallel
        const [statsRes, volumeRes, callsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/call-volume'),
          fetch('/api/dashboard/calls?limit=10'),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (volumeRes.ok) {
          const volumeData = await volumeRes.json()
          setCallVolume(volumeData.data)
        }

        if (callsRes.ok) {
          const callsData = await callsRes.json()
          setRecentCalls(callsData.data)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-[#F5F5F7]">Dashboard</h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Call analytics and insights
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday ?? 0}
          trend={stats?.callsTodayTrend}
          loading={loading}
        />
        <StatCard
          title="Calls This Month"
          value={stats?.callsThisMonth ?? 0}
          trend={stats?.callsThisMonthTrend}
          loading={loading}
        />
        <StatCard
          title="Avg Call Duration"
          value={formatDuration(stats?.avgDuration ?? 0)}
          loading={loading}
        />
        <StatCard
          title="Sentiment Score"
          value={stats?.sentimentScore ? `${(stats.sentimentScore * 100).toFixed(0)}%` : '—'}
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CallVolumeChart data={callVolume} loading={loading} />
        <SentimentBreakdownChart
          data={stats?.sentimentBreakdown ?? { positive: 0, negative: 0, neutral: 0, mixed: 0 }}
          loading={loading}
        />
      </div>

      {/* Recent Calls */}
      <RecentCallsList calls={recentCalls} loading={loading} />
    </div>
  )
}
