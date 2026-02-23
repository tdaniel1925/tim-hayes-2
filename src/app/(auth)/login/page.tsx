'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Invalid email or password')
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError('Invalid email or password')
        setIsLoading(false)
        return
      }

      // Get user details from users table to check role and status
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', authData.user.id)
        .single()

      if (userError || !user) {
        await supabase.auth.signOut()
        setError('User account not found')
        setIsLoading(false)
        return
      }

      if (!user.is_active) {
        await supabase.auth.signOut()
        setError('Account suspended. Please contact support.')
        setIsLoading(false)
        return
      }

      // Redirect based on role
      if (user.role === 'super_admin') {
        router.push('/admin')
      } else if (user.role === 'tenant_admin' || user.role === 'manager' || user.role === 'viewer') {
        router.push('/dashboard')
      } else {
        await supabase.auth.signOut()
        setError('Invalid user role')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1117] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">AudiaPro</h1>
          <p className="text-sm text-gray-400">Sign in to your account</p>
        </div>

        <div className="bg-[#1A1D24] border border-gray-800 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  className="w-full px-3 py-2 bg-[#0F1117] border border-gray-700 rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent pr-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[#FF7F50] text-white text-sm font-medium rounded-md hover:bg-[#FF6A3D] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:ring-offset-2 focus:ring-offset-[#1A1D24] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Call Recording & Analytics Platform
        </p>
      </div>
    </div>
  )
}
