// Error types and factory with HTTP status code mapping
// IMPORTANT: verifyAuth and all auth checks must THROW errors, never return them

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Error code definitions
export const AUTH_ERRORS = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const

export const VALIDATION_ERRORS = {
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
} as const

export const RESOURCE_ERRORS = {
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
} as const

export const INTEGRATION_ERRORS = {
  PBX_CONNECTION_FAILED: 'PBX_CONNECTION_FAILED',
  PBX_AUTH_FAILED: 'PBX_AUTH_FAILED',
  RECORDING_NOT_FOUND: 'RECORDING_NOT_FOUND',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
} as const

export const SYSTEM_ERRORS = {
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
} as const

// Error code to HTTP status code mapping
const ERROR_STATUS_MAP: Record<string, number> = {
  // Auth errors (401, 403)
  SESSION_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  USER_NOT_FOUND: 401,
  ACCOUNT_SUSPENDED: 403,
  INSUFFICIENT_PERMISSIONS: 403,

  // Validation errors (400)
  INVALID_INPUT: 400,
  MISSING_REQUIRED_FIELD: 400,
  INVALID_FORMAT: 400,

  // Resource errors (404, 409)
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,

  // Integration errors (502, 503)
  PBX_CONNECTION_FAILED: 502,
  PBX_AUTH_FAILED: 502,
  RECORDING_NOT_FOUND: 404,
  TRANSCRIPTION_FAILED: 503,
  ANALYSIS_FAILED: 503,

  // System errors (500)
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
  ENCRYPTION_ERROR: 500,
}

// Default error messages
const ERROR_MESSAGES: Record<string, string> = {
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  USER_NOT_FOUND: 'User not found.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact your administrator.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  INVALID_INPUT: 'Invalid input provided.',
  MISSING_REQUIRED_FIELD: 'Required field is missing.',
  INVALID_FORMAT: 'Invalid format.',
  NOT_FOUND: 'Resource not found.',
  ALREADY_EXISTS: 'Resource already exists.',
  CONFLICT: 'Request conflicts with existing resource.',
  PBX_CONNECTION_FAILED: 'Failed to connect to PBX system.',
  PBX_AUTH_FAILED: 'PBX authentication failed.',
  RECORDING_NOT_FOUND: 'Call recording not found.',
  TRANSCRIPTION_FAILED: 'Failed to transcribe audio.',
  ANALYSIS_FAILED: 'Failed to analyze transcript.',
  DATABASE_ERROR: 'Database error occurred.',
  INTERNAL_ERROR: 'An internal error occurred.',
  ENCRYPTION_ERROR: 'Encryption error occurred.',
}

/**
 * Create an AppError with appropriate HTTP status code
 * @param code Error code from one of the error constant objects
 * @param message Optional custom message (defaults to predefined message)
 * @throws AppError - Always throws, never returns
 */
export function createError(code: string, message?: string): never {
  const statusCode = ERROR_STATUS_MAP[code] || 500
  const defaultMessage = ERROR_MESSAGES[code] || 'An error occurred.'

  throw new AppError(message || defaultMessage, code, statusCode)
}
