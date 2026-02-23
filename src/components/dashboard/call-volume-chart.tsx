'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface CallVolumeData {
  date: string
  count: number
}

interface CallVolumeChartProps {
  data: CallVolumeData[]
  loading?: boolean
}

export function CallVolumeChart({ data, loading = false }: CallVolumeChartProps) {
  if (loading) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <div className="h-6 w-40 bg-[#2E3142] rounded mb-6 animate-pulse" />
        <div className="h-64 flex items-end gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[#2E3142] rounded animate-pulse"
              style={{ height: `${Math.random() * 100}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-6">
          Call Volume (Last 30 Days)
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-[13px] text-[#5C6370]">No call data yet</p>
        </div>
      </div>
    )
  }

  // Format date for display (show every 5th day)
  const formatDate = (dateStr: string, index: number) => {
    if (index % 5 === 0) {
      const date = new Date(dateStr)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
    return ''
  }

  return (
    <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
      <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-6">
        Call Volume (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(value, index) => formatDate(value, index)}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            stroke="#2E3142"
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            stroke="#2E3142"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1D27',
              border: '1px solid #2E3142',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#F5F5F7',
            }}
            labelFormatter={(label) => {
              const date = new Date(label)
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
            formatter={(value: number) => [`${value} calls`, 'Count']}
          />
          <Bar
            dataKey="count"
            fill="#FF7F50"
            radius={[4, 4, 0, 0]}
            onMouseEnter={(data, index, e) => {
              if (e && e.target) {
                (e.target as SVGRectElement).setAttribute('fill', '#FF9970')
              }
            }}
            onMouseLeave={(data, index, e) => {
              if (e && e.target) {
                (e.target as SVGRectElement).setAttribute('fill', '#FF7F50')
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
