'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Play,
  Pause,
  Download,
  Copy,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

interface CallDetail {
  id: string
  src: string
  dst: string
  call_direction: 'inbound' | 'outbound' | 'internal'
  duration_seconds: number | null
  disposition: string
  start_time: string
  processing_status: string
  recording_storage_path: string | null
  transcript_text_storage_path: string | null
  speaker_count: number | null
}

interface CallAnalysis {
  summary: string | null
  sentiment_overall: string | null
  sentiment_score: number | null
  talk_ratio_caller: number | null
  talk_ratio_agent: number | null
  talk_time_caller_seconds: number | null
  talk_time_agent_seconds: number | null
  silence_seconds: number | null
  keywords: any
  topics: any
  action_items: any
  compliance_score: number | null
  compliance_flags: any
  escalation_risk: string | null
  escalation_reasons: string[] | null
}

interface SignedUrls {
  recording?: string
  transcript?: string
  analysis?: string
}

export default function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)

  const [callId, setCallId] = useState<string>('')
  const [call, setCall] = useState<CallDetail | null>(null)
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null)
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({})
  const [transcript, setTranscript] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setCallId(p.id))
  }, [params])

  // Fetch call detail
  useEffect(() => {
    if (!callId) return

    const fetchCallDetail = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/dashboard/calls/${callId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch call details')
        }

        const data = await response.json()
        setCall(data.call)
        setAnalysis(data.analysis)
        setSignedUrls(data.signedUrls)

        // Fetch transcript if available
        if (data.signedUrls.transcript) {
          const transcriptRes = await fetch(data.signedUrls.transcript)
          if (transcriptRes.ok) {
            const transcriptText = await transcriptRes.text()
            setTranscript(transcriptText)
          }
        }
      } catch (err) {
        console.error('Error fetching call detail:', err)
        setError('Failed to load call details')
      } finally {
        setLoading(false)
      }
    }

    fetchCallDetail()
  }, [callId])

  // Audio player handlers
  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const handleDownload = () => {
    if (signedUrls.recording) {
      window.open(signedUrls.recording, '_blank')
    }
  }

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript)
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF7F50]" />
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[13px] text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to calls
        </button>
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-12 text-center">
          <p className="text-[15px] text-red-400">{error || 'Call not found'}</p>
        </div>
      </div>
    )
  }

  const directionIcon =
    call.call_direction === 'inbound' ? (
      <ArrowDownLeft className="h-6 w-6 text-green-400" />
    ) : call.call_direction === 'outbound' ? (
      <ArrowUpRight className="h-6 w-6 text-blue-400" />
    ) : null

  const directionLabel =
    call.call_direction === 'inbound'
      ? 'Inbound Call'
      : call.call_direction === 'outbound'
        ? 'Outbound Call'
        : 'Internal Call'

  // Talk ratio chart data
  const talkRatioData = analysis
    ? [
        {
          name: 'Speaker 1',
          value: analysis.talk_time_caller_seconds || 0,
          color: '#FF7F50',
        },
        {
          name: 'Speaker 2',
          value: analysis.talk_time_agent_seconds || 0,
          color: '#3B82F6',
        },
        {
          name: 'Silence',
          value: analysis.silence_seconds || 0,
          color: '#6B7280',
        },
      ].filter((item) => item.value > 0)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[13px] text-[#9CA3AF] hover:text-[#F5F5F7] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to calls
        </button>

        <div className="flex items-start gap-4">
          {directionIcon}
          <div className="flex-1">
            <h1 className="text-[20px] font-semibold text-[#F5F5F7] mb-2">{directionLabel}</h1>
            <div className="flex items-center gap-4 text-[15px]">
              <span className="font-mono text-[#F5F5F7]">{call.src}</span>
              <span className="text-[#5C6370]">→</span>
              <span className="font-mono text-[#F5F5F7]">{call.dst}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[13px] text-[#9CA3AF]">
              <span>{new Date(call.start_time).toLocaleString()}</span>
              <span>•</span>
              <span>{formatTime(call.duration_seconds || 0)}</span>
              <span>•</span>
              <StatusBadge status={call.disposition.toLowerCase()} type="disposition" />
              {analysis?.sentiment_overall && (
                <>
                  <span>•</span>
                  <StatusBadge status={analysis.sentiment_overall} type="job_status" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Processing status */}
        {call.processing_status === 'processing' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <span className="text-[13px] text-blue-400">Processing call recording...</span>
          </div>
        )}

        {call.processing_status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-[13px] text-red-400">Processing failed</span>
          </div>
        )}
      </div>

      {/* Audio Player */}
      {signedUrls.recording && (
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
          <h2 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Recording</h2>

          <audio
            ref={audioRef}
            src={signedUrls.recording}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="space-y-4">
            {/* Progress bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-[#2E3142] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF7F50]"
            />

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-[#FF7F50] hover:bg-[#FF9970] transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center justify-between text-[12px] font-mono text-[#9CA3AF]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback speed */}
              <div className="flex items-center gap-1">
                {[0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`px-2 py-1 text-[11px] rounded ${
                      playbackRate === rate
                        ? 'bg-[#FF7F50] text-white'
                        : 'bg-[#2E3142] text-[#9CA3AF] hover:bg-[#3A3E52]'
                    } transition-colors`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 text-[12px] bg-[#2E3142] text-[#9CA3AF] hover:bg-[#3A3E52] rounded-md transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#F5F5F7]">Transcript</h2>
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] bg-[#2E3142] text-[#9CA3AF] hover:bg-[#3A3E52] rounded-md transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto bg-[#0F1117] rounded-lg p-4">
            <p className="text-[13px] text-[#F5F5F7] leading-relaxed whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {analysis && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Summary */}
          {analysis.summary && (
            <div className="bg-[#1A1D27] border border-[#2E3142] border-l-4 border-l-[#FF7F50] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-[#FF7F50]" />
                <h3 className="text-[15px] font-semibold text-[#F5F5F7]">Summary</h3>
              </div>
              <p className="text-[13px] text-[#9CA3AF] leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Sentiment */}
          {analysis.sentiment_overall && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Sentiment</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#9CA3AF]">Overall</span>
                  <StatusBadge status={analysis.sentiment_overall} type="job_status" />
                </div>
                {analysis.sentiment_score !== null && (
                  <div>
                    <div className="flex items-center justify-between text-[12px] text-[#9CA3AF] mb-1">
                      <span>Score</span>
                      <span>{Math.round(analysis.sentiment_score * 100)}%</span>
                    </div>
                    <div className="h-2 bg-[#2E3142] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#FF7F50]"
                        style={{ width: `${analysis.sentiment_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keywords */}
          {analysis.keywords && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(analysis.keywords) ? analysis.keywords : []).map(
                  (keyword: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-[12px] bg-[#242736] text-[#9CA3AF] rounded-full"
                    >
                      {keyword}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Topics */}
          {analysis.topics && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(analysis.topics) ? analysis.topics : []).map(
                  (topic: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-[12px] border border-[#2E3142] text-[#9CA3AF] rounded-full"
                    >
                      {topic}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Action Items */}
          {analysis.action_items && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Action Items</h3>
              {Array.isArray(analysis.action_items) && analysis.action_items.length > 0 ? (
                <ol className="space-y-2 list-decimal list-inside">
                  {analysis.action_items.map((item: string, i: number) => (
                    <li key={i} className="text-[13px] text-[#9CA3AF]">
                      {item}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-[#5C6370]">No action items identified</p>
              )}
            </div>
          )}

          {/* Compliance */}
          {analysis.compliance_score !== null && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Compliance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#9CA3AF]">Score</span>
                  <span
                    className={`text-[15px] font-semibold ${
                      analysis.compliance_score >= 0.8
                        ? 'text-green-400'
                        : analysis.compliance_score >= 0.5
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {Math.round(analysis.compliance_score * 100)}%
                  </span>
                </div>
                {analysis.compliance_flags &&
                Array.isArray(analysis.compliance_flags) &&
                analysis.compliance_flags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.compliance_flags.map((flag: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[13px] text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    No compliance issues detected
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Talk Ratio */}
          {talkRatioData.length > 0 && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Talk Ratio</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={talkRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {talkRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    content={({ payload }) => (
                      <div className="flex items-center justify-center gap-4 mt-4">
                        {payload?.map((entry, index) => (
                          <div key={`legend-${index}`} className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-[11px] text-[#9CA3AF]">
                              {entry.value}: {formatTime(talkRatioData[index].value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Escalation Risk */}
          {analysis.escalation_risk && (
            <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-6">
              <h3 className="text-[15px] font-semibold text-[#F5F5F7] mb-4">Escalation Risk</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#9CA3AF]">Risk Level</span>
                  <StatusBadge
                    status={analysis.escalation_risk}
                    type={
                      analysis.escalation_risk === 'low'
                        ? 'status'
                        : analysis.escalation_risk === 'medium'
                          ? 'job_status'
                          : 'disposition'
                    }
                  />
                </div>
                {analysis.escalation_reasons && analysis.escalation_reasons.length > 0 && (
                  <ul className="space-y-1 list-disc list-inside">
                    {analysis.escalation_reasons.map((reason, i) => (
                      <li key={i} className="text-[13px] text-[#9CA3AF]">
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No analysis available */}
      {!analysis && call.processing_status === 'completed' && (
        <div className="bg-[#1A1D27] border border-[#2E3142] rounded-lg p-12 text-center">
          <p className="text-[13px] text-[#5C6370]">No analysis available for this call</p>
        </div>
      )}
    </div>
  )
}
