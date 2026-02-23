'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, Column, PaginationData } from '@/components/shared/data-table'
import { StatusDot } from '@/components/shared/status-dot'
import { CreateConnectionModal } from './create-connection-modal'

interface Connection {
  id: string
  name: string
  tenant_id: string
  tenants?: { name: string }
  host: string
  port: number
  status: 'active' | 'inactive' | 'error'
  last_connected_at: string | null
  last_error: string | null
  created_at: string
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Map<string, { success: boolean; message: string }>>(new Map())

  // Format relative date
  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Never'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`
    return date.toLocaleDateString()
  }

  // Test connection
  const handleTestConnection = async (connectionId: string) => {
    setTestingIds((prev) => new Set(prev).add(connectionId))
    setTestResults((prev) => {
      const newMap = new Map(prev)
      newMap.delete(connectionId)
      return newMap
    })

    try {
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Connection test successful')
        setTestResults((prev) => new Map(prev).set(connectionId, { success: true, message: 'Connected' }))
        // Refresh connections to update last_connected_at
        fetchConnections(pagination.page, pagination.limit)
        setTimeout(() => {
          setTestResults((prev) => {
            const newMap = new Map(prev)
            newMap.delete(connectionId)
            return newMap
          })
        }, 3000)
      } else {
        const errorMessage = data.error || 'Connection test failed'
        toast.error(errorMessage)
        setTestResults((prev) => new Map(prev).set(connectionId, {
          success: false,
          message: data.error || 'Failed'
        }))
      }
    } catch (error) {
      toast.error('Connection test failed')
      setTestResults((prev) => new Map(prev).set(connectionId, {
        success: false,
        message: 'Connection error'
      }))
    } finally {
      setTestingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(connectionId)
        return newSet
      })
    }
  }

  // Define columns
  const columns: Column<Connection>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (conn) => (
        <span className="font-medium text-[15px]">{conn.name}</span>
      ),
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (conn) => (
        <span className="text-[13px] text-[#9CA3AF]">
          {conn.tenants?.name || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'host',
      label: 'Host',
      render: (conn) => (
        <span className="font-mono text-[12px] text-[#9CA3AF]">
          {conn.host}:{conn.port}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (conn) => <StatusDot status={conn.status} />,
    },
    {
      key: 'last_connected_at',
      label: 'Last Connected',
      align: 'right',
      sortable: true,
      render: (conn) => (
        <span
          className="text-[13px] text-[#9CA3AF]"
          title={conn.last_connected_at ? new Date(conn.last_connected_at).toLocaleString() : 'Never connected'}
        >
          {formatRelativeDate(conn.last_connected_at)}
        </span>
      ),
    },
    {
      key: 'last_error',
      label: 'Last Error',
      render: (conn) => (
        conn.last_error ? (
          <span
            className="text-[12px] text-red-400 truncate max-w-[200px] block"
            title={conn.last_error}
          >
            {conn.last_error}
          </span>
        ) : (
          <span className="text-[13px] text-[#5C6370]">—</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (conn) => {
        const isTesting = testingIds.has(conn.id)
        const result = testResults.get(conn.id)

        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTestConnection(conn.id)
            }}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium border border-[#2E3142] rounded-md hover:bg-[#242736] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTesting && <Loader2 className="h-3 w-3 animate-spin" />}
            {!isTesting && result?.success && <Check className="h-3 w-3 text-green-400" />}
            {!isTesting && result && !result.success && <X className="h-3 w-3 text-red-400" />}
            <span className={result?.success ? 'text-green-400' : result && !result.success ? 'text-red-400' : 'text-[#9CA3AF]'}>
              {isTesting ? 'Testing...' : result ? result.message : 'Test'}
            </span>
          </button>
        )
      },
    },
  ]

  // Fetch connections
  const fetchConnections = async (page = pagination.page, limit = pagination.limit) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/connections?page=${page}&limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }

      const data = await response.json()
      setConnections(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching connections:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchConnections()
  }, [])

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchConnections(newPage, pagination.limit)
  }

  // Handle page size change
  const handlePageSizeChange = (newLimit: number) => {
    fetchConnections(1, newLimit)
  }

  // Handle connection created
  const handleConnectionCreated = (newConnection: Connection) => {
    fetchConnections(1, pagination.limit)
  }

  // Handle row click
  const handleRowClick = (connection: Connection) => {
    // TODO: Navigate to connection detail page
    console.log('Clicked connection:', connection)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F7]">PBX Connections</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">
            Manage Grandstream UCM connections for all tenants
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Connection
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={connections}
        pagination={pagination}
        loading={loading}
        emptyMessage="No connections found"
        emptyDescription="Create your first PBX connection to get started"
        onRowClick={handleRowClick}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Create Modal */}
      <CreateConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleConnectionCreated}
      />
    </div>
  )
}
