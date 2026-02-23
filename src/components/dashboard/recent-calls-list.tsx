'use client'

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

interface CallAnalysis {
  sentiment_overall: string | null
  sentiment_score: number | null
}

interface Call {
  id: string
  src: string
  dst: string
  call_direction: 'inbound' | 'outbound' | 'internal'
  duration_seconds: number | null
  start_time: string
  call_analyses?: CallAnalysis[] | CallAnalysis | null
}

interface RecentCallsListProps {
  calls: Call[]
  loading?: boolean
}

export function RecentCallsList({ calls, loading = false }: RecentCallsListProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

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

  const getSentiment = (call: Call): string | null => {
    if (!call.call_analyses) return null

    // Handle both array and single object
    if (Array.isArray(call.call_analyses) && call.call_analyses.length > 0) {
      return call.call_analyses[0].sentiment_overall
    }

    if (typeof call.call_analyses === 'object' && 'sentiment_overall' in call.call_analyses) {
      return call.call_analyses.sentiment_overall
    }

    return null
  }

  if (loading) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <div className="h-6 w-32 bg-[#2E3142] rounded mb-6 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#2E3142] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!calls || calls.length === 0) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-6">
          Recent Calls
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-[13px] text-[#5C6370]">No recent calls</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[15px] font-semibold text-[#F5F5F7]">
          Recent Calls
        </h3>
        <Link
          href="/dashboard/calls"
          className="text-[12px] text-[#FF7F50] hover:text-[#FF9970] transition-colors"
        >
          View all calls →
        </Link>
      </div>
      <div className="space-y-0">
        {calls.map((call) => {
          const sentiment = getSentiment(call)
          return (
            <Link
              key={call.id}
              href={`/dashboard/calls/${call.id}`}
              className="flex items-center gap-3 py-3 border-b border-[#2E3142] last:border-0 hover:bg-[#242736] -mx-6 px-6 transition-colors"
            >
              <div className="flex-shrink-0">
                {getDirectionIcon(call.call_direction)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#F5F5F7] font-medium truncate">
                  {call.call_direction === 'outbound' ? call.dst : call.src}
                </p>
                <p className="text-[11px] text-[#9CA3AF] truncate">
                  {call.call_direction === 'outbound' ? `To: ${call.dst}` : `From: ${call.src}`}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[12px] text-[#9CA3AF]">
                  {formatDuration(call.duration_seconds)}
                </span>
                {sentiment && (
                  <StatusBadge status={sentiment} type="job_status" />
                )}
                <span className="text-[11px] text-[#5C6370] w-16 text-right">
                  {formatRelativeTime(call.start_time)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
