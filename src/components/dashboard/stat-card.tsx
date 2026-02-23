'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  trend?: number
  loading?: boolean
}

export function StatCard({ title, value, trend, loading = false }: StatCardProps) {
  if (loading) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 animate-pulse">
        <div className="h-4 w-24 bg-[#2E3142] rounded mb-3" />
        <div className="h-8 w-32 bg-[#2E3142] rounded mb-2" />
        {trend !== undefined && <div className="h-3 w-16 bg-[#2E3142] rounded" />}
      </div>
    )
  }

  return (
    <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 hover:-translate-y-0.5 transition-transform">
      <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide mb-1">
        {title}
      </p>
      <p className="text-[24px] font-semibold text-[#F5F5F7] mb-1">
        {value}
      </p>
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {trend > 0 ? (
            <>
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-[11px] text-green-400">+{trend.toFixed(1)}%</span>
            </>
          ) : trend < 0 ? (
            <>
              <TrendingDown className="h-3 w-3 text-red-400" />
              <span className="text-[11px] text-red-400">{trend.toFixed(1)}%</span>
            </>
          ) : (
            <span className="text-[11px] text-[#9CA3AF]">No change</span>
          )}
        </div>
      )}
    </div>
  )
}
