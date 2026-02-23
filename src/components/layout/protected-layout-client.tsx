'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { AppShell } from './app-shell'

interface ProtectedLayoutClientProps {
  children: React.ReactNode
}

export function ProtectedLayoutClient({ children }: ProtectedLayoutClientProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarCollapsed(true)
      } else {
        setIsSidebarCollapsed(false)
      }
    }

    // Set initial state
    handleResize()

    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <AppShell onToggleSidebar={toggleSidebar}>{children}</AppShell>
    </div>
  )
}
