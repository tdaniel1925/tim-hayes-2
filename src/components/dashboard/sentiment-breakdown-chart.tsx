'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

interface SentimentBreakdown {
  positive: number
  negative: number
  neutral: number
  mixed: number
}

interface SentimentBreakdownChartProps {
  data: SentimentBreakdown
  loading?: boolean
}

const COLORS = {
  positive: '#10B981',  // green
  neutral: '#6B7280',   // gray
  negative: '#EF4444',  // red
  mixed: '#F59E0B',     // yellow
}

export function SentimentBreakdownChart({ data, loading = false }: SentimentBreakdownChartProps) {
  if (loading) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <div className="h-6 w-40 bg-[#2E3142] rounded mb-6 animate-pulse" />
        <div className="h-64 flex items-center justify-center">
          <div className="h-48 w-48 rounded-full bg-[#2E3142] animate-pulse" />
        </div>
      </div>
    )
  }

  const total = data.positive + data.negative + data.neutral + data.mixed

  if (total === 0) {
    return (
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-6">
          Sentiment Breakdown
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-[13px] text-[#5C6370]">No sentiment data yet</p>
        </div>
      </div>
    )
  }

  const chartData = [
    { name: 'Positive', value: data.positive, color: COLORS.positive },
    { name: 'Neutral', value: data.neutral, color: COLORS.neutral },
    { name: 'Negative', value: data.negative, color: COLORS.negative },
    { name: 'Mixed', value: data.mixed, color: COLORS.mixed },
  ].filter((item) => item.value > 0)

  const renderCustomLabel = ({ cx, cy }: { cx: number; cy: number }) => {
    return (
      <text
        x={cx}
        y={cy}
        fill="#F5F5F7"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[24px] font-semibold"
      >
        {total}
      </text>
    )
  }

  return (
    <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
      <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-6">
        Sentiment Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={256}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={renderCustomLabel}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            content={({ payload }) => {
              return (
                <div className="flex items-center justify-center gap-6 mt-4">
                  {payload?.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-[12px] text-[#9CA3AF]">
                        {entry.value}: {chartData[index].value}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
