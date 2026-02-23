'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { DataTable, Column, PaginationData } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { CreateTenantModal } from './create-tenant-modal'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  billing_plan: string
  calls_processed: number
  created_at: string
}

export default function TenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Format relative date
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US')
  }

  // Define columns
  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (tenant) => (
        <span className="font-medium text-[15px]">{tenant.name}</span>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: true,
      render: (tenant) => (
        <span className="font-mono text-[12px] text-[#9CA3AF]">{tenant.slug}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (tenant) => <StatusBadge status={tenant.status} type="status" />,
    },
    {
      key: 'billing_plan',
      label: 'Plan',
      align: 'center',
      render: (tenant) => <StatusBadge status={tenant.billing_plan} type="plan" />,
    },
    {
      key: 'calls_processed',
      label: 'Calls Processed',
      align: 'right',
      sortable: true,
      render: (tenant) => (
        <span className="font-medium tabular-nums">{formatNumber(tenant.calls_processed)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      align: 'right',
      sortable: true,
      render: (tenant) => (
        <span
          className="text-[13px] text-[#9CA3AF]"
          title={new Date(tenant.created_at).toLocaleString()}
        >
          {formatRelativeDate(tenant.created_at)}
        </span>
      ),
    },
  ]

  // Fetch tenants
  const fetchTenants = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tenants?page=${page}&limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }

      const data = await response.json()
      setTenants(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchTenants()
  }, [])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchTenants(newPage, pagination.limit)
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    fetchTenants(1, newLimit)
  }

  // Handle tenant creation success
  const handleTenantCreated = (newTenant: Tenant) => {
    // Refresh the list
    fetchTenants(1, pagination.limit)
  }

  // Handle row click
  const handleRowClick = (tenant: Tenant) => {
    router.push(`/admin/tenants/${tenant.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F7]">Tenants</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Manage all tenants and their billing plans
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tenants}
        pagination={pagination}
        loading={loading}
        emptyMessage="No tenants found"
        emptyDescription="Create your first tenant to get started"
        onRowClick={handleRowClick}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Create Modal */}
      <CreateTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTenantCreated}
      />
    </div>
  )
}
