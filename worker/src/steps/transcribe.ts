/**
 * Transcription Step
 * Sends audio to Deepgram Nova-2 with diarization for speaker identification
 */

import { createClient } from '@deepgram/sdk'

export interface TranscriptionConfig {
  apiKey: string
  audioBuffer: Buffer
  mimeType?: string
}

export interface Utterance {
  speaker: number
  text: string
  start: number // seconds
  end: number // seconds
  confidence: number
}

export interface SpeakerStats {
  speaker: number
  totalSeconds: number
  wordCount: number
  averageConfidence: number
}

export interface TranscriptionResult {
  text: string // Full transcript
  utterances: Utterance[] // Speaker-segmented utterances
  speakers: SpeakerStats[] // Per-speaker statistics
  duration: number // Total audio duration in seconds
}

/**
 * Transcribe audio using Deepgram Nova-2 with speaker diarization
 */
export async function transcribeAudio(
  config: TranscriptionConfig
): Promise<TranscriptionResult> {
  try {
    // Initialize Deepgram client
    const deepgram = createClient(config.apiKey)

    // Send audio for transcription with diarization enabled
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      config.audioBuffer,
      {
        model: 'nova-2',
        diarize: true,
        punctuate: true,
        smart_format: true,
        utterances: true,
        language: 'en',
      }
    )

    if (error) {
      throw new DeepgramError(`Deepgram API error: ${error.message}`)
    }

    if (!result || !result.results) {
      throw new DeepgramError('No transcription results returned from Deepgram')
    }

    const transcript = result.results.channels[0]
    if (!transcript) {
      throw new DeepgramError('No channel data in transcription results')
    }

    // Extract full text
    const fullText = transcript.alternatives[0]?.transcript || ''

    // Extract utterances with speaker labels
    const utterances: Utterance[] = []
    if (result.results.utterances) {
      for (const utt of result.results.utterances) {
        utterances.push({
          speaker: utt.speaker ?? 0,
          text: utt.transcript,
          start: utt.start,
          end: utt.end,
          confidence: utt.confidence,
        })
      }
    }

    // Calculate speaker statistics
    const speakerMap = new Map<number, { duration: number; words: number; confidence: number[] }>()

    for (const utt of utterances) {
      if (!speakerMap.has(utt.speaker)) {
        speakerMap.set(utt.speaker, { duration: 0, words: 0, confidence: [] })
      }

      const stats = speakerMap.get(utt.speaker)!
      stats.duration += utt.end - utt.start
      stats.words += utt.text.split(/\s+/).length
      stats.confidence.push(utt.confidence)
    }

    const speakers: SpeakerStats[] = Array.from(speakerMap.entries()).map(
      ([speaker, stats]) => ({
        speaker,
        totalSeconds: Math.round(stats.duration * 100) / 100,
        wordCount: stats.words,
        averageConfidence:
          Math.round(
            (stats.confidence.reduce((sum, c) => sum + c, 0) / stats.confidence.length) * 100
          ) / 100,
      })
    )

    // Sort speakers by total talk time (descending)
    speakers.sort((a, b) => b.totalSeconds - a.totalSeconds)

    // Get total duration from metadata
    const duration = result.results.channels[0]?.alternatives[0]?.words?.slice(-1)[0]?.end || 0

    return {
      text: fullText,
      utterances,
      speakers,
      duration: Math.round(duration * 100) / 100,
    }
  } catch (error) {
    if (error instanceof DeepgramError) {
      throw error
    }

    if (error instanceof Error) {
      // Handle specific Deepgram errors
      if (error.message.includes('401')) {
        throw new DeepgramError('Invalid Deepgram API key')
      }
      if (error.message.includes('402')) {
        throw new DeepgramError('Insufficient Deepgram credits')
      }
      if (error.message.includes('413')) {
        throw new DeepgramError('Audio file too large')
      }
      if (error.message.includes('timeout')) {
        throw new DeepgramError('Deepgram request timed out')
      }

      throw new DeepgramError(`Transcription failed: ${error.message}`)
    }

    throw new DeepgramError(`Unknown error: ${String(error)}`)
  }
}

/**
 * Custom error class for transcription errors
 */
export class DeepgramError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeepgramError'
  }
}
