import { dbManager } from '../database'
import { ipcMain } from 'electron'
import crypto from 'crypto'
import { encryptToHex, decryptFromHex } from '../utils/secure-store'
import { emailService } from './email-service'

export class AuthService {
  private disconnectCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()
  private resetCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>()

  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('auth:login', async (_, { email, password }) => {
      return this.login(email, password)
    })

    ipcMain.handle('auth:register', async (_, { email, password, username }) => {
      return this.register(email, password, username)
    })

    ipcMain.handle('auth:check', async (_, { token }: { token: string | null }) => {
      return this.checkSession(token || '')
    })

    ipcMain.handle('auth:logout', async (_, { token }: { token: string | null }) => {
      await this.logout(token || '')
      return true
    })

    ipcMain.handle('auth:update-username', async (_, { userId, newUsername }) => {
      return this.updateUsername(userId, newUsername)
    })

    ipcMain.handle('auth:update-profile', async (_, payload) => {
      return this.updateProfile(payload)
    })

    ipcMain.handle('auth:initiate-disconnect', async (_, { userId }) => {
      return this.initiateDisconnect(userId)
    })

    ipcMain.handle('auth:verify-disconnect', async (_, { userId, code }) => {
      return this.verifyDisconnect(userId, code)
    })

    ipcMain.handle('auth:initiate-reset', async (_, { email }) => {
      return this.initiatePasswordReset(email)
    })

    ipcMain.handle('auth:verify-reset-code', async (_, { email, code }) => {
      return this.verifyResetCode(email, code)
    })

    ipcMain.handle('auth:complete-reset', async (_, { email, code, newPassword }) => {
      return this.completePasswordReset(email, code, newPassword)
    })
  }

  async login(email: string, password: string): Promise<any> {
    const db = dbManager.getDb()
    const row = db.prepare('SELECT id, email, username, avatar_url, password_hash FROM users WHERE email = ?').get(email) as any

    if (!row) {
      throw new Error('Invalid credentials')
    }

    const ok = await this.verifyPassword(password, row.password_hash)
    if (!ok) {
      throw new Error('Invalid credentials')
    }

    const session = this.createSession(row.id)
    return { user: { id: row.id, email: row.email, username: row.username, avatar_url: row.avatar_url }, token: session.token }
  }

  async register(email: string, password: string, username: string): Promise<any> {
    const db = dbManager.getDb()
    const id = crypto.randomUUID()
    const passwordHash = await this.hashPassword(password)
    
    // Ensure unique username
    const uniqueUsername = this.getUniqueUsername(username)

    try {
      db.prepare('INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)')
        .run(id, email, passwordHash, uniqueUsername)
      
      // Send welcome email to the new user
      await emailService.sendWelcomeEmail(uniqueUsername, email)

      const session = this.createSession(id)
      return { user: { id, email, username: uniqueUsername, avatar_url: null }, token: session.token }
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Email already exists')
      }
      throw e
    }
  }

  private getUniqueUsername(username: string, excludeUserId?: string): string {
    const db = dbManager.getDb()
    let candidate = username
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      // Check if candidate exists
      let stmt = 'SELECT id FROM users WHERE username = ?'
      const params: any[] = [candidate]
      
      if (excludeUserId) {
        stmt += ' AND id != ?'
        params.push(excludeUserId)
      }

      const existing = db.prepare(stmt).get(...params)
      
      if (!existing) {
        return candidate
      }

      // Generate random 4-digit number
      const suffix = Math.floor(1000 + Math.random() * 9000) // 1000-9999
      candidate = `${username}#${suffix}`
      attempts++
    }
    
    // Fallback if super unlucky
    return `${username}#${Date.now().toString().slice(-4)}`
  }

  private async hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex')
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, 32, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey as Buffer)
      })
    })
    return `scrypt:${salt}:${derived.toString('hex')}`
  }

  private async verifyPassword(password: string, stored: string) {
    if (stored.startsWith('scrypt:')) {
      const parts = stored.split(':')
      if (parts.length !== 3) return false
      const salt = parts[1]
      const hash = parts[2]
      const derived = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(password, salt, 32, (err, derivedKey) => {
          if (err) reject(err)
          else resolve(derivedKey as Buffer)
        })
      })
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived)
    }
    const sha = crypto.createHash('sha256').update(password).digest('hex')
    return sha === stored
  }

  private createSession(userId: string) {
    const db = dbManager.getDb()
    const id = crypto.randomUUID()
    const tokenPlain = crypto.randomBytes(32).toString('hex')
    const tokenHash = encryptToHex(tokenPlain)
    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    db.prepare(
      'INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_activity_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, tokenHash, now.toISOString(), expires.toISOString(), now.toISOString())
    return { id, token: tokenPlain }
  }

  private checkSession(token: string) {
    if (!token) return null
    const db = dbManager.getDb()
    const rows = db.prepare('SELECT * FROM sessions').all() as any[]
    let match: any = null
    for (const row of rows) {
      try {
        const plain = decryptFromHex(row.token_hash)
        if (plain === token) {
          match = row
          break
        }
      } catch {
      }
    }
    if (!match) return null
    const now = new Date()
    const exp = new Date(match.expires_at)
    if (now > exp) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(match.id)
      return null
    }
    db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?').run(now.toISOString(), match.id)
    const user = db
      .prepare('SELECT id, email, username, avatar_url FROM users WHERE id = ?')
      .get(match.user_id) as any
    return user || null
  }

  private async logout(token: string) {
    if (!token) return
    const db = dbManager.getDb()
    const rows = db.prepare('SELECT * FROM sessions').all() as any[]
    for (const row of rows) {
      try {
        const plain = decryptFromHex(row.token_hash)
        if (plain === token) {
          db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id)
          break
        }
      } catch {
      }
    }
  }

  private async updateUsername(userId: string, newUsername: string) {
    const db = dbManager.getDb()
    const existing = db
      .prepare('SELECT username_updated_at, created_at FROM users WHERE id = ?')
      .get(userId) as any
    if (!existing) {
      throw new Error('User not found')
    }
    const now = new Date()
    const lastChange = existing.username_updated_at
      ? new Date(existing.username_updated_at)
      : new Date(existing.created_at)
    const diffMs = now.getTime() - lastChange.getTime()
    const minInterval = 7 * 24 * 60 * 60 * 1000
    if (diffMs < minInterval) {
      throw new Error('Username was changed recently')
    }
    
    // Ensure unique username
    const uniqueUsername = this.getUniqueUsername(newUsername, userId)

    try {
      db.prepare('UPDATE users SET username = ?, username_updated_at = ? WHERE id = ?').run(
        uniqueUsername,
        now.toISOString(),
        userId
      )
    } catch (e: any) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Username already taken')
      }
      throw e
    }
    const user = db
      .prepare('SELECT id, email, username, avatar_url FROM users WHERE id = ?')
      .get(userId) as any
    this.logProfileChange(userId, 'username', existing.username, uniqueUsername)
    db.prepare('UPDATE users SET profile_last_updated_at = ? WHERE id = ?').run(now.toISOString(), userId)
    return user
  }

  private logProfileChange(userId: string, field: string, oldValue: string | null, newValue: string | null) {
    const db = dbManager.getDb()
    const id = crypto.randomUUID()
    db.prepare(
      'INSERT INTO profile_audit_log (id, user_id, field, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, field, oldValue, newValue, new Date().toISOString())
  }

  private validateEmail(email: string) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email is required')
    }
    if (email.length > 254) {
      throw new Error('Email is too long')
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) {
      throw new Error('Email is not valid')
    }
  }

  private validateDisplayName(name: string) {
    if (!name || typeof name !== 'string') {
      throw new Error('Display name is required')
    }
    const trimmed = name.trim()
    if (trimmed.length < 3 || trimmed.length > 32) {
      throw new Error('Display name must be between 3 and 32 characters')
    }
    const re = /^[a-zA-Z0-9 _.-]+$/
    if (!re.test(trimmed)) {
      throw new Error('Display name contains invalid characters')
    }
  }

  private async enforceProfileRateLimit(userId: string) {
    const db = dbManager.getDb()
    const row = db.prepare('SELECT profile_last_updated_at FROM users WHERE id = ?').get(userId) as any
    const now = new Date()
    if (!row || !row.profile_last_updated_at) {
      return
    }
    const last = new Date(row.profile_last_updated_at)
    const diffMs = now.getTime() - last.getTime()
    const minInterval = 30 * 1000
    if (diffMs < minInterval) {
      throw new Error('Profile was updated too recently')
    }
  }

  private async verifyUserPassword(userId: string, password: string) {
    if (!password) {
      throw new Error('Password is required')
    }
    const db = dbManager.getDb()
    const row = db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(userId) as any
    if (!row) {
      throw new Error('User not found')
    }
    const ok = await this.verifyPassword(password, row.password_hash)
    if (!ok) {
      throw new Error('Password is incorrect')
    }
  }

  private async updateProfile(payload: {
    userId: string
    displayName?: string
    email?: string
    avatarDataUrl?: string | null
    currentPassword?: string
  }) {
    const { userId, displayName, email, avatarDataUrl, currentPassword } = payload
    const db = dbManager.getDb()
    const user = db
      .prepare('SELECT id, email, username, avatar_url FROM users WHERE id = ?')
      .get(userId) as any
    if (!user) {
      throw new Error('User not found')
    }

    await this.enforceProfileRateLimit(userId)

    let newEmail = user.email
    let newName = user.username
    let newAvatar = user.avatar_url as string | null

    if (displayName !== undefined && displayName !== user.username) {
      this.validateDisplayName(displayName)
      newName = this.getUniqueUsername(displayName.trim(), userId)
    }

    if (email !== undefined && email !== user.email) {
      this.validateEmail(email)
      await this.verifyUserPassword(userId, currentPassword || '')
      newEmail = email.trim()
    }

    if (avatarDataUrl !== undefined && avatarDataUrl !== user.avatar_url) {
      if (avatarDataUrl && !avatarDataUrl.startsWith('data:image/')) {
        throw new Error('Avatar must be an image')
      }
      newAvatar = avatarDataUrl || null
    }

    const now = new Date().toISOString()

    const tx = db.transaction(() => {
      db.prepare(
        'UPDATE users SET email = ?, username = ?, avatar_url = ?, profile_last_updated_at = ? WHERE id = ?'
      ).run(newEmail, newName, newAvatar, now, userId)

      if (newName !== user.username) {
        this.logProfileChange(userId, 'username', user.username, newName)
      }
      if (newEmail !== user.email) {
        this.logProfileChange(userId, 'email', user.email, newEmail)
      }
      if (newAvatar !== user.avatar_url) {
        this.logProfileChange(userId, 'avatar_url', user.avatar_url, newAvatar)
      }
    })

    tx()

    const updated = db
      .prepare('SELECT id, email, username, avatar_url FROM users WHERE id = ?')
      .get(userId) as any

    return updated
  }

  private async initiateDisconnect(userId: string) {
    const db = dbManager.getDb()
    const user = db.prepare('SELECT email, username FROM users WHERE id = ?').get(userId) as any
    if (!user) throw new Error('User not found')

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    this.disconnectCodes.set(userId, { code, expiresAt, attempts: 0 })

    await emailService.sendDisconnectCode(user.username, user.email, code)
    return { success: true, email: user.email }
  }

  private async verifyDisconnect(userId: string, code: string) {
    const record = this.disconnectCodes.get(userId)
    if (!record) throw new Error('No disconnect request found')

    if (Date.now() > record.expiresAt) {
      this.disconnectCodes.delete(userId)
      throw new Error('Code expired')
    }

    if (record.attempts >= 3) {
      this.disconnectCodes.delete(userId)
      throw new Error('Too many failed attempts')
    }

    if (record.code !== code) {
      record.attempts++
      this.disconnectCodes.set(userId, record)
      throw new Error('Invalid code')
    }

    this.disconnectCodes.delete(userId)
    
    return this.performDisconnect(userId)
  }

  private async performDisconnect(userId: string) {
    const db = dbManager.getDb()
    const user = db
      .prepare('SELECT id, email, username FROM users WHERE id = ?')
      .get(userId) as any
    if (!user) {
      throw new Error('User not found')
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
      db.prepare('DELETE FROM messages WHERE owner_id = ?').run(userId)
      this.logProfileChange(userId, 'account', user.email, null)
      db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    })

    tx()

    return { success: true }
  }

  private async initiatePasswordReset(email: string) {
    const db = dbManager.getDb()
    const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email) as any
    if (!user) throw new Error('User not found')

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    this.resetCodes.set(email, { code, expiresAt, attempts: 0 })

    await emailService.sendPasswordResetCode(user.username, email, code)
    return { success: true }
  }

  private async verifyResetCode(email: string, code: string) {
    const record = this.resetCodes.get(email)
    if (!record) throw new Error('No reset request found')

    if (Date.now() > record.expiresAt) {
      this.resetCodes.delete(email)
      throw new Error('Code expired')
    }

    if (record.attempts >= 3) {
      this.resetCodes.delete(email)
      throw new Error('Too many failed attempts')
    }

    if (record.code !== code) {
      record.attempts++
      this.resetCodes.set(email, record)
      throw new Error('Invalid code')
    }

    return { success: true }
  }

  private async completePasswordReset(email: string, code: string, newPassword: string) {
    await this.verifyResetCode(email, code)

    const db = dbManager.getDb()
    const passwordHash = await this.hashPassword(newPassword)

    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email)
    
    this.resetCodes.delete(email)

    return { success: true }
  }
}

export const authService = new AuthService()
