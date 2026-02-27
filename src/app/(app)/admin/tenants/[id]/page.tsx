'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, UserCheck, UserX, Loader2, Phone, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, Column, PaginationData } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { CreateUserModal } from './create-user-modal'

interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled'
  billing_email: string | null
  billing_plan: 'free' | 'starter' | 'professional' | 'enterprise'
  calls_processed_total: number
  audio_minutes_total: number
  storage_bytes_total: number
  recording_retention_days: number
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'tenant_admin' | 'manager' | 'viewer'
  is_active: boolean
  timezone: string
  email_notifications_enabled: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

interface TenantStats {
  total_users: number
  active_users: number
  total_connections: number
  active_connections: number
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format storage size
  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Toggle user active status
  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        toast.success(currentStatus ? 'User deactivated' : 'User activated')
        fetchUsers(pagination.page, pagination.limit)
        fetchStats()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to update user')
      }
    } catch (error) {
      toast.error('Failed to update user')
      console.error('Error updating user:', error)
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // Define columns
  const columns: Column<User>[] = [
    {
      key: 'full_name',
      label: 'Name',
      sortable: true,
      render: (user) => (
        <div>
          <div className="font-medium text-[15px] text-[#F5F5F7]">
            {user.full_name || 'Unnamed'}
          </div>
          <div className="text-[12px] text-[#5C6370]">{user.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      align: 'center',
      render: (user) => (
        <span className="text-[13px] text-[#9CA3AF] capitalize">
          {user.role.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center',
      render: (user) => (
        <StatusBadge
          status={user.is_active ? 'active' : 'suspended'}
          type="status"
        />
      ),
    },
    {
      key: 'last_login_at',
      label: 'Last Login',
      align: 'right',
      sortable: true,
      render: (user) => (
        <span className="text-[13px] text-[#9CA3AF]">
          {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      align: 'right',
      sortable: true,
      render: (user) => (
        <span className="text-[13px] text-[#9CA3AF]">
          {formatDate(user.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (user) => {
        const isToggling = togglingIds.has(user.id)

        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleUserActive(user.id, user.is_active)
            }}
            disabled={isToggling}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium border border-[#2E3142] rounded-md hover:bg-[#242736] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isToggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : user.is_active ? (
              <UserX className="h-3 w-3" />
            ) : (
              <UserCheck className="h-3 w-3" />
            )}
            <span className="text-[#9CA3AF]">
              {isToggling
                ? 'Updating...'
                : user.is_active
                ? 'Deactivate'
                : 'Activate'}
            </span>
          </button>
        )
      },
    },
  ]

  // Fetch tenant details
  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/tenants/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tenant')
      }
      const data = await response.json()
      setTenant(data)
    } catch (error) {
      console.error('Error fetching tenant:', error)
      toast.error('Failed to load tenant details')
    }
  }

  // Fetch tenant stats
  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      // Fetch users count
      const usersResponse = await fetch(`/api/tenants/${id}/users?limit=1`)
      const usersData = await usersResponse.json()
      const totalUsers = usersData.pagination.total

      // Fetch active users count
      const activeUsersResponse = await fetch(
        `/api/tenants/${id}/users?limit=1&is_active=true`
      )
      const activeUsersData = await activeUsersResponse.json()
      const activeUsers = activeUsersData.pagination.total

      // Fetch connections count (would need a similar endpoint)
      // For now, set to 0
      const totalConnections = 0
      const activeConnections = 0

      setStats({
        total_users: totalUsers,
        active_users: activeUsers,
        total_connections: totalConnections,
        active_connections: activeConnections,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch users
  const fetchUsers = async (
    page = pagination.page,
    limit = pagination.limit
  ) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/tenants/${id}/users?page=${page}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchTenant()
    fetchStats()
    fetchUsers()
  }, [])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, pagination.limit)
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    fetchUsers(1, newLimit)
  }

  // Handle user created
  const handleUserCreated = () => {
    fetchUsers(1, pagination.limit)
    fetchStats()
  }

  // Handle row click
  const handleRowClick = (user: User) => {
    // TODO: Navigate to user detail page or show inline details
    console.log('Clicked user:', user)
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-[#2E3142] rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 w-24 bg-[#2E3142] rounded mb-3" />
              <div className="h-8 w-16 bg-[#2E3142] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md hover:bg-[#1A1D27] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#9CA3AF]" />
          </button>
          <div>
            <h1 className="text-[24px] font-semibold text-[#F5F5F7]">
              {tenant.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[13px] text-[#5C6370]">
                {tenant.slug}
              </span>
              <StatusBadge status={tenant.status} type="status" />
              <StatusBadge status={tenant.billing_plan} type="plan" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4">
          <p className="text-[11px] text-[#5C6370] uppercase tracking-wider mb-2">
            Calls Processed
          </p>
          {statsLoading ? (
            <div className="h-8 w-20 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <p className="text-[24px] font-semibold text-[#F5F5F7]">
              {tenant.calls_processed_total.toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4">
          <p className="text-[11px] text-[#5C6370] uppercase tracking-wider mb-2">
            Users
          </p>
          {statsLoading ? (
            <div className="h-8 w-20 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-[24px] font-semibold text-[#F5F5F7]">
                {stats?.active_users || 0}
              </p>
              <span className="text-[13px] text-[#5C6370]">
                / {stats?.total_users || 0}
              </span>
            </div>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4">
          <p className="text-[11px] text-[#5C6370] uppercase tracking-wider mb-2">
            Audio Minutes
          </p>
          {statsLoading ? (
            <div className="h-8 w-20 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <p className="text-[24px] font-semibold text-[#F5F5F7]">
              {tenant.audio_minutes_total.toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-4">
          <p className="text-[11px] text-[#5C6370] uppercase tracking-wider mb-2">
            Storage Used
          </p>
          {statsLoading ? (
            <div className="h-8 w-20 bg-[#2E3142] rounded animate-pulse" />
          ) : (
            <p className="text-[24px] font-semibold text-[#F5F5F7]">
              {formatStorageSize(tenant.storage_bytes_total)}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#FF7F50]/10 rounded-lg">
              <Phone className="h-6 w-6 text-[#FF7F50]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#F5F5F7]">Call Records</h3>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                {tenant.calls_processed_total === 0
                  ? 'No calls processed yet'
                  : `${tenant.calls_processed_total.toLocaleString()} call${tenant.calls_processed_total !== 1 ? 's' : ''} processed`}
              </p>
            </div>
          </div>
          <Link
            href={`/admin/calls?tenant_id=${id}`}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1117] border border-[#2E3142] text-[#F5F5F7] text-[13px] font-medium rounded-md hover:bg-[#1A1D27] transition-colors"
          >
            View All Calls
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Users Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Users</h2>
            <p className="text-[13px] text-[#9CA3AF] mt-1">
              Manage user access for this tenant
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Users Table */}
        <DataTable
          columns={columns}
          data={users}
          pagination={pagination}
          loading={loading}
          emptyMessage="No users found"
          emptyDescription="Create the first user for this tenant to get started"
          onRowClick={handleRowClick}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleUserCreated}
        tenantId={id}
        tenantName={tenant.name}
      />
    </div>
  )
}
