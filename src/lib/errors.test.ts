import { describe, it, expect } from 'vitest'
import { createError, AppError, AUTH_ERRORS, VALIDATION_ERRORS, RESOURCE_ERRORS } from './errors'

describe('Error Factory', () => {
  it('should create error with SESSION_EXPIRED code and 401 status', () => {
    expect(() => createError(AUTH_ERRORS.SESSION_EXPIRED)).toThrow(AppError)

    try {
      createError(AUTH_ERRORS.SESSION_EXPIRED)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('SESSION_EXPIRED')
      expect((error as AppError).statusCode).toBe(401)
      expect((error as AppError).message).toBe('Your session has expired. Please log in again.')
    }
  })

  it('should create error with ACCOUNT_SUSPENDED code and 403 status', () => {
    try {
      createError(AUTH_ERRORS.ACCOUNT_SUSPENDED)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('ACCOUNT_SUSPENDED')
      expect((error as AppError).statusCode).toBe(403)
      expect((error as AppError).message).toContain('suspended')
    }
  })

  it('should create error with INSUFFICIENT_PERMISSIONS code and 403 status', () => {
    try {
      createError(AUTH_ERRORS.INSUFFICIENT_PERMISSIONS)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('INSUFFICIENT_PERMISSIONS')
      expect((error as AppError).statusCode).toBe(403)
    }
  })

  it('should create error with INVALID_INPUT code and 400 status', () => {
    try {
      createError(VALIDATION_ERRORS.INVALID_INPUT)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('INVALID_INPUT')
      expect((error as AppError).statusCode).toBe(400)
    }
  })

  it('should create error with NOT_FOUND code and 404 status', () => {
    try {
      createError(RESOURCE_ERRORS.NOT_FOUND)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('NOT_FOUND')
      expect((error as AppError).statusCode).toBe(404)
    }
  })

  it('should create error with ALREADY_EXISTS code and 409 status', () => {
    try {
      createError(RESOURCE_ERRORS.ALREADY_EXISTS)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('ALREADY_EXISTS')
      expect((error as AppError).statusCode).toBe(409)
    }
  })

  it('should allow custom error messages', () => {
    const customMessage = 'Custom error message for testing'

    try {
      createError(AUTH_ERRORS.SESSION_EXPIRED, customMessage)
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).message).toBe(customMessage)
      expect((error as AppError).code).toBe('SESSION_EXPIRED')
      expect((error as AppError).statusCode).toBe(401)
    }
  })

  it('should default to 500 status for unknown error codes', () => {
    try {
      createError('UNKNOWN_ERROR_CODE')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('UNKNOWN_ERROR_CODE')
      expect((error as AppError).statusCode).toBe(500)
    }
  })

  it('should always throw and never return', () => {
    // TypeScript should enforce that createError returns 'never'
    // This test verifies runtime behavior
    let errorThrown = false

    try {
      createError(AUTH_ERRORS.SESSION_EXPIRED)
    } catch {
      errorThrown = true
    }

    expect(errorThrown).toBe(true)
  })

  it('should create AppError with correct properties', () => {
    try {
      createError(AUTH_ERRORS.INVALID_CREDENTIALS)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).name).toBe('AppError')
      expect((error as AppError).code).toBeTruthy()
      expect((error as AppError).statusCode).toBeTypeOf('number')
      expect((error as AppError).message).toBeTypeOf('string')
    }
  })
})
