import { z } from 'zod'

/**
 * Grandstream CDR Webhook Payload Schema
 * Based on actual Grandstream UCM webhook format
 */
export const GrandstreamWebhookSchema = z.object({
  // Event type (always "cdr" for call completion)
  event: z.string().optional().default('cdr'),

  // Call identifiers
  uniqueid: z.string().min(1, 'uniqueid is required'),
  linkedid: z.string().optional().nullable(),
  session: z.string().optional().nullable(),
  callid: z.string().optional().nullable(),

  // Call parties
  src: z.string().min(1, 'Source number is required'),
  dst: z.string().min(1, 'Destination number is required'),
  clid: z.string().optional().nullable(),

  // Timing (can be strings from webhook)
  start: z.string().optional().nullable(),
  answer: z.string().optional().nullable(),
  end: z.string().optional().nullable(),
  duration: z.coerce.number().optional().nullable(),
  billsec: z.coerce.number().optional().nullable(),

  // Call status
  disposition: z
    .enum(['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION'])
    .default('FAILED'),
  amaflags: z.string().optional().nullable(),

  // Channel info
  dcontext: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  dstchannel: z.string().optional().nullable(),

  // Recording
  recording_filename: z.string().optional().nullable(),

  // Grandstream-specific fields
  lastapp: z.string().optional().nullable(),
  lastdata: z.string().optional().nullable(),
  accountcode: z.string().optional().nullable(),
  userfield: z.string().optional().nullable(),
  did: z.string().optional().nullable(),
  outbound_cnum: z.string().optional().nullable(),
  outbound_cnam: z.string().optional().nullable(),
  dst_cnam: z.string().optional().nullable(),
  peeraccount: z.string().optional().nullable(),
  sequence: z.string().optional().nullable(),
  src_trunk_name: z.string().optional().nullable(),
  dst_trunk_name: z.string().optional().nullable(),
})

export type GrandstreamWebhookPayload = z.infer<typeof GrandstreamWebhookSchema>

/**
 * Determine call direction based on trunk names and numbers
 */
export function determineCallDirection(payload: GrandstreamWebhookPayload): string {
  // If there's a destination trunk, it's outbound
  if (payload.dst_trunk_name) {
    return 'outbound'
  }

  // If there's a source trunk, it's inbound
  if (payload.src_trunk_name) {
    return 'inbound'
  }

  // If both source and destination are internal extensions (e.g., 4 digits starting with 1-8)
  // This is a simple heuristic - adjust based on your numbering plan
  const srcIsInternal = /^[1-8]\d{3}$/.test(payload.src)
  const dstIsInternal = /^[1-8]\d{3}$/.test(payload.dst)

  if (srcIsInternal && dstIsInternal) {
    return 'internal'
  }

  // Default: if source looks like external (10+ digits), it's inbound
  if (payload.src.length >= 10) {
    return 'inbound'
  }

  // Otherwise assume outbound
  return 'outbound'
}

/**
 * Parse ISO date string or fallback formats
 */
export function parseWebhookDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  try {
    // Try parsing as-is (ISO format)
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }

    // Try parsing common Grandstream format: "YYYY-MM-DD HH:MM:SS"
    const matches = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
    if (matches) {
      const [, year, month, day, hour, minute, second] = matches
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      )
    }

    return null
  } catch {
    return null
  }
}
