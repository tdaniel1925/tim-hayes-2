interface StatusDotProps {
  status: 'active' | 'inactive' | 'error'
  label?: string
}

const statusColors = {
  active: 'bg-green-400',
  inactive: 'bg-gray-400',
  error: 'bg-red-400',
}

export function StatusDot({ status, label }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
      {label && <span className="text-[13px] text-[#F5F5F7]">{label}</span>}
    </div>
  )
}
