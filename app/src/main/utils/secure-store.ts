import crypto from 'crypto'
import { app } from 'electron'
import { join } from 'path'

function getKey() {
  // In portable mode, we need a stable key that doesn't depend on the absolute path
  // (which changes with drive letters). We use a fixed relative path identifier or
  // a specific environment marker.
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    // Use a fixed identifier for the portable instance.
    // Ideally this would be a salt stored in the data dir, but for simplicity/portability
    // we use a constant derived from the app name, allowing the folder to move.
    return crypto.createHash('sha256').update('PlayHub-Portable-Secure-Key').digest()
  }

  const base = app.getPath('userData')
  return crypto.createHash('sha256').update(base).digest()
}

export function encryptToHex(plain: string) {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('hex')
}

export function decryptFromHex(payload: string) {
  const key = getKey()
  const buf = Buffer.from(payload, 'hex')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

