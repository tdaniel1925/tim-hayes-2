'use client'

export default function DebugPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
      : 'NOT SET',
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
            <p className="text-sm text-[#9CA3AF] mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY:</p>
            <p className="text-[15px] text-[#F5F5F7] font-mono">{envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}</p>
          </div>

          <div className="mt-6 pt-6 border-t border-[#2E3142]">
            <p className="text-sm text-[#9CA3AF] mb-2">
              If any values show "NOT SET", the environment variables were not available during build.
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
