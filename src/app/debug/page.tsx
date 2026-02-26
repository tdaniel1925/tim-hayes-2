'use client'

export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY_FULL: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY_LENGTH: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
  }

  return (
    <div className="min-h-screen bg-[#0F1117] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Environment Variables Debug</h1>

        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-[#9CA3AF] mb-1">NEXT_PUBLIC_SUPABASE_URL:</p>
            <p className="text-[15px] text-[#F5F5F7] font-mono">{envVars.NEXT_PUBLIC_SUPABASE_URL}</p>
          </div>

          <div>
            <p className="text-sm text-[#9CA3AF] mb-1">NEXT_PUBLIC_APP_URL:</p>
            <p className="text-[15px] text-[#F5F5F7] font-mono">{envVars.NEXT_PUBLIC_APP_URL}</p>
          </div>

          <div>
            <p className="text-sm text-[#9CA3AF] mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY (Full):</p>
            <p className="text-[13px] text-[#F5F5F7] font-mono break-all">{envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY_FULL}</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Length: {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY_LENGTH} chars (should be 214)</p>
          </div>

          <div className="mt-6 pt-6 border-t border-[#2E3142]">
            <p className="text-sm text-[#9CA3AF] mb-2">
              If any values show &quot;NOT SET&quot;, the environment variables were not available during build.
            </p>
            <p className="text-sm text-[#9CA3AF]">
              Solution: Redeploy from Vercel dashboard with environment variables set.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
