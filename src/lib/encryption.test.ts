import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from './encryption'

describe('Encryption', () => {
  beforeAll(() => {
    // Set encryption key for testing
    process.env.ENCRYPTION_KEY = '9c130cac93de215da22533c37c56349a49b94fc080c54e9be65d95b789e756d4'
  })

  it('should encrypt and decrypt a string correctly', () => {
    const plaintext = 'hello world'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for same plaintext (due to random IV)', () => {
    const plaintext = 'test password'
    const encrypted1 = encrypt(plaintext)
    const encrypted2 = encrypt(plaintext)

    expect(encrypted1).not.toBe(encrypted2)
    expect(decrypt(encrypted1)).toBe(plaintext)
    expect(decrypt(encrypted2)).toBe(plaintext)
  })

  it('should handle empty strings', () => {
    const plaintext = ''
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('should handle special characters', () => {
    const plaintext = 'P@ssw0rd!#$%^&*(){}[]|\\:";\'<>,.?/~`'
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('should handle long strings', () => {
    const plaintext = 'a'.repeat(1000)
    const encrypted = encrypt(plaintext)
    const decrypted = decrypt(encrypted)

    expect(decrypted).toBe(plaintext)
  })

  it('should produce ciphertext in correct format (iv:authTag:encrypted)', () => {
    const plaintext = 'test'
    const encrypted = encrypt(plaintext)
    const parts = encrypted.split(':')

    expect(parts.length).toBe(3)
    expect(parts[0].length).toBe(24) // 12 bytes IV = 24 hex chars
    expect(parts[1].length).toBe(32) // 16 bytes auth tag = 32 hex chars
    expect(parts[2].length).toBeGreaterThan(0) // encrypted data
  })

  it('should throw error if ENCRYPTION_KEY is not set', () => {
    const originalKey = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY

    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')

    process.env.ENCRYPTION_KEY = originalKey
  })

  it('should throw error if ENCRYPTION_KEY has wrong length', () => {
    const originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'tooshort'

    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters')

    process.env.ENCRYPTION_KEY = originalKey
  })

  it('should throw error for invalid ciphertext format', () => {
    expect(() => decrypt('invalid')).toThrow('Invalid ciphertext format')
    expect(() => decrypt('only:two')).toThrow('Invalid ciphertext format')
  })

  it('should throw error for tampered ciphertext', () => {
    const plaintext = 'sensitive data'
    const encrypted = encrypt(plaintext)
    const parts = encrypted.split(':')

    // Tamper with the encrypted data
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`

    expect(() => decrypt(tampered)).toThrow()
  })
})
