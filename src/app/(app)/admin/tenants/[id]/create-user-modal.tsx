'use client'

import { useState, useEffect } from 'react'
import { X, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
  tenantName: string
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  tenantName,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'tenant_admin' | 'manager' | 'viewer'>('tenant_admin')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setShowPassword(false)
      setFullName('')
      setRole('tenant_admin')
      setErrors({})
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Generate random password
  const generatePassword = () => {
    const length = 16
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setPassword(password)
    setShowPassword(true)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (password.length > 100) {
      newErrors.password = 'Password must be less than 100 characters'
    }

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (fullName.length > 255) {
      newErrors.fullName = 'Full name must be less than 255 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          tenant_id: tenantId,
          role,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create user')
      }

      toast.success('User created successfully')
      onSuccess()
      handleClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
      toast.error(errorMessage)
      console.error('Error creating user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1A1D27] border border-[#2E3142] rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2E3142]">
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">
              Create User
            </h2>
            <p className="text-[13px] text-[#5C6370] mt-1">
              Add a new user to {tenantName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 rounded-md hover:bg-[#242736] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5 text-[#9CA3AF]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[13px] text-[#9CA3AF] mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                setErrors((prev) => ({ ...prev, fullName: '' }))
              }}
              placeholder="e.g. John Smith"
              disabled={isSubmitting}
              className={`w-full px-3 py-2 bg-[#0F1117] border ${
                errors.fullName ? 'border-red-500' : 'border-[#2E3142]'
              } rounded-md text-[13px] text-[#F5F5F7] placeholder-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.fullName && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="text-[12px] text-red-400">{errors.fullName}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[13px] text-[#9CA3AF] mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: '' }))
              }}
              placeholder="e.g. john@example.com"
              disabled={isSubmitting}
              className={`w-full px-3 py-2 bg-[#0F1117] border ${
                errors.email ? 'border-red-500' : 'border-[#2E3142]'
              } rounded-md text-[13px] text-[#F5F5F7] placeholder-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.email && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="text-[12px] text-red-400">{errors.email}</span>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[13px] text-[#9CA3AF]">
                Password <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                disabled={isSubmitting}
                className="text-[12px] text-[#FF7F50] hover:text-[#FF6A3D] transition-colors disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder="Minimum 8 characters"
                disabled={isSubmitting}
                className={`w-full px-3 py-2 pr-10 bg-[#0F1117] border ${
                  errors.password ? 'border-red-500' : 'border-[#2E3142]'
                } rounded-md text-[13px] text-[#F5F5F7] placeholder-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6370] hover:text-[#9CA3AF] transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="text-[12px] text-red-400">{errors.password}</span>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-[13px] text-[#9CA3AF] mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'tenant_admin' | 'manager' | 'viewer')
              }
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-[#0F1117] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="tenant_admin">Tenant Admin (full access)</option>
              <option value="manager">Manager (can manage calls)</option>
              <option value="viewer">Viewer (read-only access)</option>
            </select>
            <p className="text-[12px] text-[#5C6370] mt-1">
              {role === 'tenant_admin' &&
                'Full access to all tenant features including user management'}
              {role === 'manager' &&
                'Can view and manage calls, but cannot manage users'}
              {role === 'viewer' && 'Can only view calls and analytics'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2E3142]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[13px] font-medium text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
