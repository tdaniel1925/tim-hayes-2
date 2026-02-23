import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Text */}
        <h1 className="text-[64px] font-bold text-[#FF7F50] mb-4">404</h1>

        {/* Message */}
        <h2 className="text-[24px] font-semibold text-[#F5F5F7] mb-2">
          Page Not Found
        </h2>
        <p className="text-[13px] text-[#9CA3AF] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FF7F50] text-white rounded-md text-[13px] font-medium hover:bg-[#FF9970] transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1D27] border border-[#2E3142] text-[#F5F5F7] rounded-md text-[13px] font-medium hover:bg-[#242736] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
