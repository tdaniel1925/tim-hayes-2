/**
 * AI Analysis Step
 * Sends transcript and call metadata to Claude API for structured analysis
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SpeakerStats } from './transcribe'

export interface AnalysisConfig {
  apiKey: string
  transcript: string
  callMetadata: {
    src: string
    dst: string
    duration: number
    direction: string
  }
  speakerStats?: SpeakerStats[]
}

export interface CallAnalysis {
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  sentimentScore: number // 0.0 to 1.0
  keywords: string[]
  topics: string[]
  actionItems: string[]
  questions: string[]
  objections: string[]
  escalationRisk: 'low' | 'medium' | 'high'
  escalationReasons: string[]
  satisfactionPrediction: 'satisfied' | 'neutral' | 'dissatisfied'
  complianceFlags: string[]
  callDisposition: string
  talkRatio?: {
    // Calculated from speaker stats
    speaker0Percentage: number
    speaker1Percentage: number
  }
}

/**
 * Analyze call transcript using Claude API
 */
export async function analyzeCall(config: AnalysisConfig): Promise<CallAnalysis> {
  try {
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: config.apiKey,
    })

    // Build the analysis prompt using the exact template from PROJECT-SPEC.md
    const prompt = buildAnalysisPrompt(config)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text from response
    const contentBlock = response.content[0]
    if (contentBlock.type !== 'text') {
      throw new ClaudeError('Unexpected response type from Claude API')
    }

    const responseText = contentBlock.text

    // Parse JSON response
    let analysis: CallAnalysis
    try {
      analysis = JSON.parse(responseText)
    } catch (error) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1])
      } else {
        throw new ClaudeError('Failed to parse Claude response as JSON')
      }
    }

    // Validate required fields
    validateAnalysis(analysis)

    // Calculate talk ratio if speaker stats available
    if (config.speakerStats && config.speakerStats.length >= 2) {
      const totalTime = config.speakerStats.reduce((sum, s) => sum + s.totalSeconds, 0)
      const speaker0 = config.speakerStats.find((s) => s.speaker === 0)
      const speaker1 = config.speakerStats.find((s) => s.speaker === 1)

      if (speaker0 && speaker1 && totalTime > 0) {
        analysis.talkRatio = {
          speaker0Percentage: Math.round((speaker0.totalSeconds / totalTime) * 100),
          speaker1Percentage: Math.round((speaker1.totalSeconds / totalTime) * 100),
        }
      }
    }

    return analysis
  } catch (error) {
    if (error instanceof ClaudeError) {
      throw error
    }

    if (error instanceof Error) {
      // Handle Anthropic API errors
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new ClaudeError('Invalid Anthropic API key')
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        throw new ClaudeError('Claude API rate limit exceeded')
      }
      if (error.message.includes('500') || error.message.includes('503')) {
        throw new ClaudeError('Claude API service error')
      }
      if (error.message.includes('timeout')) {
        throw new ClaudeError('Claude API request timed out')
      }

      throw new ClaudeError(`Analysis failed: ${error.message}`)
    }

    throw new ClaudeError(`Unknown error: ${String(error)}`)
  }
}

/**
 * Build the analysis prompt using the exact template from PROJECT-SPEC.md
 */
function buildAnalysisPrompt(config: AnalysisConfig): string {
  const { transcript, callMetadata } = config

  return `You are an expert call analyst. Analyze the following call transcript and provide structured insights.

Call Details:
- Caller: ${callMetadata.src}
- Destination: ${callMetadata.dst}
- Duration: ${callMetadata.duration} seconds
- Direction: ${callMetadata.direction}

Transcript:
${transcript}

Provide your analysis as a JSON object with EXACTLY this structure (no markdown, no backticks, just raw JSON):
{
  "summary": "Brief 2-3 sentence summary of the call",
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": 0.0 to 1.0,
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "questions": ["question1", "question2", ...],
  "objections": ["objection1", "objection2", ...],
  "escalationRisk": "low|medium|high",
  "escalationReasons": ["reason1", "reason2", ...],
  "satisfactionPrediction": "satisfied|neutral|dissatisfied",
  "complianceFlags": ["flag1", "flag2", ...],
  "callDisposition": "Brief outcome of the call"
}

Return ONLY the JSON object, no additional text or formatting.`
}

/**
 * Validate that the analysis has all required fields
 */
function validateAnalysis(analysis: any): asserts analysis is CallAnalysis {
  const requiredFields = [
    'summary',
    'sentiment',
    'sentimentScore',
    'keywords',
    'topics',
    'actionItems',
    'questions',
    'objections',
    'escalationRisk',
    'escalationReasons',
    'satisfactionPrediction',
    'complianceFlags',
    'callDisposition',
  ]

  for (const field of requiredFields) {
    if (!(field in analysis)) {
      throw new ClaudeError(`Missing required field in analysis: ${field}`)
    }
  }

  // Validate sentiment values
  const validSentiments = ['positive', 'negative', 'neutral', 'mixed']
  if (!validSentiments.includes(analysis.sentiment)) {
    throw new ClaudeError(`Invalid sentiment value: ${analysis.sentiment}`)
  }

  // Validate escalation risk
  const validRisks = ['low', 'medium', 'high']
  if (!validRisks.includes(analysis.escalationRisk)) {
    throw new ClaudeError(`Invalid escalation risk: ${analysis.escalationRisk}`)
  }

  // Validate satisfaction prediction
  const validSatisfaction = ['satisfied', 'neutral', 'dissatisfied']
  if (!validSatisfaction.includes(analysis.satisfactionPrediction)) {
    throw new ClaudeError(`Invalid satisfaction prediction: ${analysis.satisfactionPrediction}`)
  }

  // Validate sentiment score range
  if (
    typeof analysis.sentimentScore !== 'number' ||
    analysis.sentimentScore < 0 ||
    analysis.sentimentScore > 1
  ) {
    throw new ClaudeError(`Invalid sentiment score: ${analysis.sentimentScore}`)
  }

  // Validate arrays
  const arrayFields = [
    'keywords',
    'topics',
    'actionItems',
    'questions',
    'objections',
    'escalationReasons',
    'complianceFlags',
  ]
  for (const field of arrayFields) {
    if (!Array.isArray(analysis[field])) {
      throw new ClaudeError(`Field ${field} must be an array`)
    }
  }
}

/**
 * Custom error class for Claude API errors
 */
export class ClaudeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeError'
  }
}
