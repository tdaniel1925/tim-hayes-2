'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/context/user-context'
import { LogoutButton } from '@/components/logout-button'
import {
  LayoutDashboard,
  Building2,
  Cable,
  ListChecks,
  BarChart3,
  Phone,
  LineChart,
  Settings,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

export function Sidebar() {
  const user = useUser()
  const pathname = usePathname()

  // Define nav items based on role
  const navItems: NavItem[] =
    user.role === 'super_admin'
      ? [
          { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
          { href: '/admin/tenants', label: 'Tenants', icon: <Building2 className="h-5 w-5" /> },
          { href: '/admin/connections', label: 'Connections', icon: <Cable className="h-5 w-5" /> },
          { href: '/admin/jobs', label: 'Jobs', icon: <ListChecks className="h-5 w-5" /> },
          { href: '/admin/stats', label: 'Stats', icon: <BarChart3 className="h-5 w-5" /> },
        ]
      : [
          { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
          { href: '/dashboard/calls', label: 'Calls', icon: <Phone className="h-5 w-5" /> },
          { href: '/dashboard/analytics', label: 'Analytics', icon: <LineChart className="h-5 w-5" /> },
          { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
        ]

  return (
    <div className="flex h-screen w-64 flex-col bg-[#1A1D24] border-r border-gray-800">
      {/* Logo/Header */}
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-white">AudiaPro</h1>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF7F50] text-white font-semibold text-sm">
            {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.fullName || user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FF7F50] text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-800">
        <LogoutButton />
      </div>
    </div>
  )
}
