interface StatusBadgeProps {
  status: string
  type?: 'status' | 'plan'
}

const statusColors: Record<string, string> = {
  // Tenant status
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  suspended: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',

  // Billing plans
  free: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  professional: 'bg-[#FF7F50]/10 text-[#FF7F50] border-[#FF7F50]/20',
  enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',

  // Processing status
  pending: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',

  // Connection status
  connected: 'bg-green-500/10 text-green-400 border-green-500/20',
  disconnected: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function StatusBadge({ status, type = 'status' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_')
  const colorClass = statusColors[normalizedStatus] || statusColors.pending

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${colorClass}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  )
}
