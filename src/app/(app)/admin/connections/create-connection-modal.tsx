'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Eye, EyeOff, Check, AlertCircle, Loader2, Copy } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
}

interface CreateConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (connection: any) => void
}

type Step = 1 | 2 | 3 | 4

export function CreateConnectionModal({ isOpen, onClose, onSuccess }: CreateConnectionModalProps) {
  const [step, setStep] = useState<Step>(1)

  // Step 1: Select Tenant
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [loadingTenants, setLoadingTenants] = useState(false)

  // Step 2: Connection Details
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('8089')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verifySSL, setVerifySSL] = useState(false)

  // Step 3: Test Connection
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Step 4: Save & Webhook
  const [saving, setSaving] = useState(false)
  const [webhookURL, setWebhookURL] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [copiedURL, setCopiedURL] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch tenants on mount
  useEffect(() => {
    if (isOpen && step === 1) {
      fetchTenants()
    }
  }, [isOpen, step])

  // Auto-run test when entering step 3
  useEffect(() => {
    if (step === 3 && !testing && !testResult) {
      handleTestConnection()
    }
  }, [step])

  const fetchTenants = async () => {
    setLoadingTenants(true)
    try {
      const response = await fetch('/api/tenants?limit=100')
      const data = await response.json()
      setTenants(data.data || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoadingTenants(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: parseInt(port),
          username,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test connection' })
    } finally {
      setTesting(false)
    }
  }

  const validateStep = (currentStep: Step): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!selectedTenantId) {
        newErrors.tenant = 'Please select a tenant'
      }
    }

    if (currentStep === 2) {
      if (!name.trim()) newErrors.name = 'Name is required'
      if (!host.trim()) newErrors.host = 'Host is required'
      if (!port.trim() || isNaN(Number(port))) newErrors.port = 'Valid port is required'
      if (!username.trim()) newErrors.username = 'Username is required'
      if (!password.trim()) newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(4, prev + 1) as Step)
    }
  }

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1) as Step)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedTenantId,
          name,
          host,
          port: parseInt(port),
          username,
          password,
          connection_type: 'grandstream_ucm',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create connection')
      }

      const newConnection = await response.json()

      // Generate webhook URL and secret
      const baseURL = window.location.origin
      setWebhookURL(`${baseURL}/api/webhook/grandstream/${newConnection.id}`)
      setWebhookSecret(newConnection.webhook_secret || 'auto-generated')

      onSuccess(newConnection)
    } catch (error) {
      console.error('Error creating connection:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create connection' })
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'url' | 'secret') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'url') {
        setCopiedURL(true)
        setTimeout(() => setCopiedURL(false), 2000)
      } else {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSelectedTenantId('')
    setName('')
    setHost('')
    setPort('8089')
    setUsername('')
    setPassword('')
    setShowPassword(false)
    setVerifySSL(false)
    setTestResult(null)
    setWebhookURL('')
    setWebhookSecret('')
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#1A1D27] border border-[#2E3142] rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E3142]">
          <div>
            <h2 className="text-[18px] font-semibold text-[#F5F5F7]">New PBX Connection</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              Step {step} of 4: {
                step === 1 ? 'Select Tenant' :
                step === 2 ? 'Connection Details' :
                step === 3 ? 'Test Connection' :
                'Webhook Configuration'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-[#242736] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[#9CA3AF]" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex px-6 py-3 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-[#FF7F50]' : 'bg-[#2E3142]'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-6 min-h-[300px]">
          {/* Step 1: Select Tenant */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="tenant" className="block text-[13px] font-medium text-[#F5F5F7] mb-2">
                  Select Tenant <span className="text-red-400">*</span>
                </label>
                {loadingTenants ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-[#FF7F50] animate-spin" />
                  </div>
                ) : (
                  <select
                    id="tenant"
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.tenant ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                  >
                    <option value="">Choose a tenant...</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.slug})
                      </option>
                    ))}
                  </select>
                )}
                {errors.tenant && (
                  <p className="mt-1 text-[11px] text-red-400">{errors.tenant}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Connection Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
                  Connection Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.name ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                  placeholder="Main Office UCM"
                />
                {errors.name && <p className="mt-1 text-[11px] text-red-400">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="host" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
                    Host <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="host"
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.host ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] font-mono text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                    placeholder="192.168.1.100"
                  />
                  {errors.host && <p className="mt-1 text-[11px] text-red-400">{errors.host}</p>}
                </div>

                <div>
                  <label htmlFor="port" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
                    Port <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.port ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] font-mono text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                    placeholder="8089"
                  />
                  {errors.port && <p className="mt-1 text-[11px] text-red-400">{errors.port}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
                  Username <span className="text-red-400">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-3 py-2 bg-[#1E2130] border ${errors.username ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                  placeholder="admin"
                />
                {errors.username && <p className="mt-1 text-[11px] text-red-400">{errors.username}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-[#F5F5F7] mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-3 py-2 pr-10 bg-[#1E2130] border ${errors.password ? 'border-red-500' : 'border-[#2E3142]'} rounded-md text-[13px] text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#FF7F50] focus:border-transparent`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#F5F5F7]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-[11px] text-red-400">{errors.password}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="verify-ssl"
                  type="checkbox"
                  checked={verifySSL}
                  onChange={(e) => setVerifySSL(e.target.checked)}
                  className="h-4 w-4 rounded border-[#2E3142] bg-[#1E2130] text-[#FF7F50] focus:ring-2 focus:ring-[#FF7F50]"
                />
                <label htmlFor="verify-ssl" className="text-[13px] text-[#F5F5F7]">
                  Verify SSL certificate
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Test Connection */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                {testing && (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-[#FF7F50] animate-spin" />
                    <p className="text-[15px] text-[#F5F5F7]">Testing connection...</p>
                    <p className="text-[13px] text-[#9CA3AF]">
                      Attempting to connect to {host}:{port}
                    </p>
                  </div>
                )}

                {!testing && testResult && testResult.success && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-[15px] font-medium text-green-400">Connection Successful!</p>
                    <p className="text-[13px] text-[#9CA3AF]">{testResult.message}</p>
                  </div>
                )}

                {!testing && testResult && !testResult.success && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-[15px] font-medium text-red-400">Connection Failed</p>
                    <p className="text-[13px] text-[#9CA3AF]">{testResult.message}</p>
                    <button
                      onClick={handleTestConnection}
                      className="mt-2 px-4 py-2 bg-[#242736] text-[#F5F5F7] text-[13px] font-medium rounded-md hover:bg-[#2E3142] transition-colors"
                    >
                      Try Again
                    </button>
                    <p className="text-[11px] text-[#9CA3AF] mt-2">
                      You can still save this connection and configure it later
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Webhook Configuration */}
          {step === 4 && webhookURL && (
            <div className="space-y-6">
              <div className="bg-[#1E2130] border border-[#2E3142] rounded-lg p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#F5F5F7]">Webhook URL</label>
                    <button
                      onClick={() => copyToClipboard(webhookURL, 'url')}
                      className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors"
                    >
                      {copiedURL ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedURL ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-[#0F1117] border border-[#2E3142] rounded-md">
                    <p className="text-[12px] font-mono text-[#F5F5F7] break-all">{webhookURL}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#F5F5F7]">Webhook Secret</label>
                    <button
                      onClick={() => copyToClipboard(webhookSecret, 'secret')}
                      className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors"
                    >
                      {copiedSecret ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedSecret ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-[#0F1117] border border-[#2E3142] rounded-md">
                    <p className="text-[12px] font-mono text-[#F5F5F7]">{webhookSecret}</p>
                  </div>
                  <p className="text-[11px] text-yellow-400 mt-1">
                    ⚠️ This secret will only be shown once. Please save it securely.
                  </p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-[13px] font-medium text-blue-400 mb-2">Configuration Instructions</p>
                <ol className="text-[12px] text-[#9CA3AF] space-y-1 list-decimal list-inside">
                  <li>Log in to your Grandstream UCM admin panel</li>
                  <li>Navigate to PBX Settings → Event Center</li>
                  <li>Find the CDR Webhook section</li>
                  <li>Paste the webhook URL above</li>
                  <li>Enter the webhook secret for authentication</li>
                  <li>Save and enable the webhook</li>
                </ol>
              </div>
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-[13px] text-red-400">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2E3142]">
          <button
            type="button"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={step === 4 && !!webhookURL}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#9CA3AF] hover:text-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {step < 4 && (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 3 && testing}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 3 && !webhookURL && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Connection'
                )}
              </button>
            )}

            {step === 4 && webhookURL && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-[#FF7F50] text-white text-[13px] font-medium rounded-md hover:bg-[#FF6A3D] transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
