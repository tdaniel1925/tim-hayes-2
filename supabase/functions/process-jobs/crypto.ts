// Encryption utilities for Deno runtime
// AES-256-GCM encryption compatible with Node.js implementation

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits

// Get encryption key from environment
function getEncryptionKey(): Uint8Array {
  const keyHex = Deno.env.get('ENCRYPTION_KEY')
  if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }

  // Convert hex string to Uint8Array
  const key = new Uint8Array(KEY_LENGTH)
  for (let i = 0; i < KEY_LENGTH; i++) {
    key[i] = parseInt(keyHex.substr(i * 2, 2), 16)
  }

  return key
}

// Import encryption key for Web Crypto API
async function importKey(): Promise<CryptoKey> {
  const keyBytes = getEncryptionKey()

  return await crypto.subtle.importKey('raw', keyBytes, { name: ALGORITHM, length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Decrypt an encrypted value
 * Format: base64(iv:ciphertext:authTag)
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  try {
    // Decode base64
    const decoded = atob(encryptedValue)

    // Split into components (stored as hex in the format iv:ciphertext:authTag)
    const parts = decoded.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }

    const [ivHex, ciphertextHex, authTagHex] = parts

    // Convert hex to Uint8Array
    const iv = hexToBytes(ivHex)
    const ciphertext = hexToBytes(ciphertextHex)
    const authTag = hexToBytes(authTagHex)

    // Combine ciphertext and auth tag for GCM
    const encryptedData = new Uint8Array(ciphertext.length + authTag.length)
    encryptedData.set(ciphertext)
    encryptedData.set(authTag, ciphertext.length)

    // Import key
    const key = await importKey()

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encryptedData
    )

    // Convert ArrayBuffer to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt value')
  }
}

/**
 * Encrypt a value
 * Returns: base64(iv:ciphertext:authTag)
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

    // Convert plaintext to Uint8Array
    const encoder = new TextEncoder()
    const plaintextBytes = encoder.encode(plaintext)

    // Import key
    const key = await importKey()

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      plaintextBytes
    )

    const encryptedBytes = new Uint8Array(encrypted)

    // GCM mode returns ciphertext + auth tag (last 16 bytes)
    const ciphertext = encryptedBytes.slice(0, -16)
    const authTag = encryptedBytes.slice(-16)

    // Convert to hex
    const ivHex = bytesToHex(iv)
    const ciphertextHex = bytesToHex(ciphertext)
    const authTagHex = bytesToHex(authTag)

    // Combine and encode as base64
    const combined = `${ivHex}:${ciphertextHex}:${authTagHex}`
    return btoa(combined)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt value')
  }
}

// Helper: Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

// Helper: Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
