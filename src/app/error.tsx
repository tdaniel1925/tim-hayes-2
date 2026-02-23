'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-[24px] font-semibold text-[#F5F5F7] mb-2">
          Something Went Wrong
        </h2>
        <p className="text-[13px] text-[#9CA3AF] mb-2">
          We encountered an unexpected error. Please try again.
        </p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 mb-6 text-left">
            <summary className="text-[12px] text-[#5C6370] cursor-pointer hover:text-[#9CA3AF] transition-colors">
              Error Details
            </summary>
            <pre className="mt-2 p-3 bg-[#1A1D27] border border-[#2E3142] rounded text-[11px] text-red-400 overflow-x-auto">
              {error.message}
            </pre>
            {error.digest && (
              <p className="mt-2 text-[11px] text-[#5C6370]">
                Error ID: {error.digest}
              </p>
            )}
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF7F50] text-white rounded-md text-[13px] font-medium hover:bg-[#FF9970] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1D27] border border-[#2E3142] text-[#F5F5F7] rounded-md text-[13px] font-medium hover:bg-[#242736] transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
