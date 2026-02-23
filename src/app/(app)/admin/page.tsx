export default function AdminPage() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Super Admin Dashboard</h1>
        <p className="text-sm text-gray-400">Welcome to the super admin dashboard</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards */}
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Total Tenants</p>
          <p className="text-3xl font-semibold text-white mt-2">1</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Active Connections</p>
          <p className="text-3xl font-semibold text-white mt-2">1</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Total Calls</p>
          <p className="text-3xl font-semibold text-white mt-2">5</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Pending Jobs</p>
          <p className="text-3xl font-semibold text-white mt-2">0</p>
        </div>
      </div>
    </div>
  )
}
