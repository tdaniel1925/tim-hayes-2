'use client'

import { Search, Bell, Menu } from 'lucide-react'

interface TopBarProps {
  title: string
  onToggleSidebar?: () => void
}

export function TopBar({ title, onToggleSidebar }: TopBarProps) {
  return (
    <div className="flex h-12 items-center justify-between px-6 bg-[#1A1D27] border-b border-[#2E3142]">
      {/* Left Section: Hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-[#242736] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-[#9CA3AF]" />
        </button>
        <h2 className="text-[16px] font-semibold text-[#F5F5F7]">{title}</h2>
      </div>

      {/* Right Section: Search + Notifications */}
      <div className="flex items-center gap-4">
        {/* Search (placeholder) */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6370]" />
          <input
            type="text"
            placeholder="Search..."
            disabled
            className="w-64 h-8 pl-8 pr-3 bg-[#1E2130] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] placeholder:text-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Notifications Bell */}
        <button
          className="relative p-2 rounded-md hover:bg-[#242736] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-[#9CA3AF]" />
          {/* Notification dot (hidden for now) */}
          {/* <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#FF7F50] rounded-full" /> */}
        </button>
      </div>
    </div>
  )
}
