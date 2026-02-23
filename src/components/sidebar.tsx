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

interface SidebarProps {
  isCollapsed?: boolean
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
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
    <div
      className={`hidden md:flex h-screen flex-col bg-[#1A1D27] border-r border-[#2E3142] transition-all duration-200 ${
        isCollapsed ? 'w-12' : 'w-60'
      }`}
    >
      {/* Logo/Header */}
      <div className="flex h-12 items-center px-4 border-b border-[#2E3142]">
        {!isCollapsed && <h1 className="text-[16px] font-semibold text-[#F5F5F7]">AudiaPro</h1>}
        {isCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7F50] text-white font-semibold text-xs">
            A
          </div>
        )}
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-[#2E3142]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7F50] text-white font-medium text-xs">
              {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#F5F5F7] truncate">{user.fullName || user.email}</p>
              <p className="text-[11px] text-[#9CA3AF] capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          {/* Tenant name for client admins */}
          {user.role === 'client_admin' && user.tenantName && (
            <div className="mt-2 px-2 py-1 bg-[#1E2130] rounded">
              <p className="text-[11px] text-[#9CA3AF]">{user.tenantName}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsed user avatar */}
      {isCollapsed && (
        <div className="px-2 py-3 border-b border-[#2E3142] flex justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7F50] text-white font-medium text-xs">
            {user.fullName?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center rounded-md py-1.5 text-[13px] font-medium transition-colors relative
                    ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-2'}
                    ${
                      isActive
                        ? 'bg-[#242736] text-[#F5F5F7] border-l-2 border-[#FF7F50]'
                        : 'text-[#9CA3AF] hover:bg-[#242736] hover:text-[#F5F5F7] border-l-2 border-transparent'
                    }
                  `}
                >
                  <span className={isActive ? 'text-[#FF7F50]' : ''}>{item.icon}</span>
                  {!isCollapsed && item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-[#2E3142]">
        <LogoutButton />
      </div>
    </div>
  )
}
