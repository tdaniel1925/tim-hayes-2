export default function DashboardPage() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Dashboard</h1>
        <p className="text-sm text-gray-400">Welcome to your dashboard</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder cards */}
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Total Calls</p>
          <p className="text-3xl font-semibold text-white mt-2">5</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Avg Call Duration</p>
          <p className="text-3xl font-semibold text-white mt-2">4:10</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Positive Sentiment</p>
          <p className="text-3xl font-semibold text-[#4ADE80] mt-2">40%</p>
        </div>
        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-400">Negative Sentiment</p>
          <p className="text-3xl font-semibold text-[#EF4444] mt-2">20%</p>
        </div>
      </div>
    </div>
  )
}
