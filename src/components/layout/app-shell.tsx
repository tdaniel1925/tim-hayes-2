'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { TopBar } from './top-bar'

interface AppShellProps {
  children: React.ReactNode
  onToggleSidebar?: () => void
}

// Map pathnames to page titles
const pageTitles: Record<string, string> = {
  '/admin': 'Super Admin Dashboard',
  '/admin/tenants': 'Tenants',
  '/admin/connections': 'PBX Connections',
  '/admin/jobs': 'Background Jobs',
  '/admin/stats': 'System Stats',
  '/dashboard': 'Dashboard',
  '/dashboard/calls': 'Call History',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
}

export function AppShell({ children, onToggleSidebar }: AppShellProps) {
  const pathname = usePathname()

  // Get page title based on current path
  const pageTitle = pageTitles[pathname] || 'AudiaPro'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar title={pageTitle} onToggleSidebar={onToggleSidebar} />
      <main className="flex-1 overflow-y-auto bg-[#0F1117] p-6">{children}</main>
    </div>
  )
}
