'use client'

import { useState, useEffect } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'

interface CreateTenantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (tenant: any) => void
}

export function CreateTenantModal({ isOpen, onClose, onSuccess }: CreateTenantModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPlan, setBillingPlan] = useState<'free' | 'starter' | 'professional' | 'enterprise'>('free')

  const [slugTouched, setSlugTouched] = useState(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugTouched && name) {
      const timer = setTimeout(() => {
        const generatedSlug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        setSlug(generatedSlug)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [name, slugTouched])

  // Check slug uniqueness
  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck) {
      setSlugAvailable(null)
      return
    }

    setSlugChecking(true)
    try {
      const response = await fetch(`/api/tenants?search=${encodeURIComponent(slugToCheck)}`)
      const data = await response.json()

      // Check if any tenant has this exact slug
      const exists = data.data?.some((tenant: any) => tenant.slug === slugToCheck)
      setSlugAvailable(!exists)
    } catch (error) {
      console.error('Error checking slug:', error)
      setSlugAvailable(null)
    } finally {
      setSlugChecking(false)
    }
  }

  const handleSlugBlur = () => {
    if (slug) {
      checkSlugAvailability(slug)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.length > 255) {
      newErrors.name = 'Name must be less than 255 characters'
    }

    if (!slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (slug.length > 100) {
      newErrors.slug = 'Slug must be less than 100 characters'
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    } else if (slugAvailable === false) {
      newErrors.slug = 'This slug is already taken'
    }

    if (billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail)) {
      newErrors.billingEmail = 'Invalid email address'
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
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          slug,
          billing_email: billingEmail || null,
          billing_plan: billingPlan,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tenant')
      }

      const newTenant = await response.json()
      onSuccess(newTenant)
      handleClose()
    } catch (error) {
      console.error('Error creating tenant:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create tenant',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setSlug('')
    setBillingEmail('')
    setBillingPlan('free')
    setSlugTouched(false)
    setSlugAvailable(null)
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#1A1D27] border border-[#2E3142] rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E3142]">
          <h2 className="text-[18px] font-semibold text-[#F5F5F7]">Create New Tenant</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-[#242736] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[#9CA3AF]" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name field */}
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.name ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] placeholder:text-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
              placeholder="Acme Corporation"
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Slug field */}
          <div>
            <label htmlFor="slug" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
              Slug <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugTouched(true)
                  setSlugAvailable(null)
                }}
                onBlur={handleSlugBlur}
                className={`w-full px-3 py-2 pr-10 bg-[#1E2130] border ${errors.slug ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] font-mono text-[#F5F5F7] placeholder:text-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                placeholder="acme-corporation"
              />
              {slugChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-[#FF7F50] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!slugChecking && slugAvailable === true && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400" />
              )}
              {!slugChecking && slugAvailable === false && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
              )}
            </div>
            {errors.slug && (
              <p className="mt-1 text-[11px] text-red-400">{errors.slug}</p>
            )}
            {!errors.slug && slugAvailable === true && (
              <p className="mt-1 text-[11px] text-green-400">Slug is available</p>
            )}
            {!errors.slug && slugAvailable === false && (
              <p className="mt-1 text-[11px] text-red-400">This slug is already taken</p>
            )}
          </div>

          {/* Billing email field */}
          <div>
            <label htmlFor="billingEmail" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
              Billing Email
            </label>
            <input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.billingEmail ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] placeholder:text-[#5C6370] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
              placeholder="billing@acme.com"
            />
            {errors.billingEmail && (
              <p className="mt-1 text-[11px] text-red-400">{errors.billingEmail}</p>
            )}
          </div>

          {/* Billing plan field */}
          <div>
            <label htmlFor="billingPlan" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
              Billing Plan
            </label>
            <select
              id="billingPlan"
              value={billingPlan}
              onChange={(e) => setBillingPlan(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#1E2130] border border-[#2E3142] rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-[13px] text-red-400">{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#2E3142]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-[13px] font-medium text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || slugChecking || slugAvailable === false}
            className="px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}
