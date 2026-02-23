'use client'

import { useUser } from '@/lib/context/user-context'
import { LogoutButton } from '@/components/logout-button'

export default function AdminPage() {
  const user = useUser()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mb-4">You are logged in as a super admin</p>

        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6 mt-8 text-left max-w-md">
          <h2 className="text-sm font-medium text-gray-300 mb-4">User Info (from useUser hook):</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">ID:</span>{' '}
              <span className="text-white font-mono">{user.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="text-white">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-500">Role:</span>{' '}
              <span className="text-[#FF7F50]">{user.role}</span>
            </div>
            <div>
              <span className="text-gray-500">Tenant ID:</span>{' '}
              <span className="text-white">{user.tenantId || 'null'}</span>
            </div>
            <div>
              <span className="text-gray-500">Full Name:</span>{' '}
              <span className="text-white">{user.fullName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Active:</span>{' '}
              <span className="text-white">{user.isActive ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
