import { ipcMain } from 'electron'
import { dbManager } from '../database'
import crypto from 'crypto'
import { encryptToHex, decryptFromHex } from '../utils/secure-store'

export type PresenceState = 'offline' | 'online' | 'away' | 'do_not_disturb'

export type IntentState =
  | 'open_for_coop'
  | 'looking_for_party'
  | 'story_mode'
  | 'competitive'
  | 'testing_mods'
  | 'idle'
  | 'custom'

type VisibilityScope = 'public' | 'friends' | 'favorites' | 'hidden'

export interface IntentMetadata {
  current_game_id?: string | null
  estimated_session_length?: number | null
  voice_chat_allowed?: boolean | null
  joinable?: boolean | null
  instability_warning?: boolean | null
  custom_label?: string | null
}

export interface PresenceStatus {
  user_id: string
  presence_state: PresenceState
  intent_state: IntentState
  intent_metadata: IntentMetadata
  visibility_scope: VisibilityScope
  expires_at: string | null
  updated_at: string
  source: 'manual' | 'auto'
}

export interface PresenceUpdateInput {
  userId: string
  presence_state?: PresenceState
  intent_state?: IntentState
  intent_metadata?: IntentMetadata
  visibility_scope?: VisibilityScope
  expires_at?: string | null
  source: 'manual' | 'auto'
}

export class SocialService {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('social:get-messages', async (_, { ownerId, friendId }) => {
      return this.getMessages(ownerId, friendId)
    })

    ipcMain.handle('social:send-message', async (_, { ownerId, friendId, platform, body, isQuick }) => {
      return this.sendMessage(ownerId, friendId, platform, body, isQuick)
    })

    ipcMain.handle('presence:get', async (_, { userId }: { userId: string }) => {
      return this.getPresence(userId)
    })

    ipcMain.handle('presence:set', async (_, payload: PresenceUpdateInput) => {
      return this.setPresence(payload)
    })
  }

  private getMessages(ownerId: string, friendId: string) {
    const db = dbManager.getDb()
    const rows = db
      .prepare(
        'SELECT id, owner_id, friend_id, platform, direction, body_encrypted, is_quick, created_at, read_at FROM messages WHERE owner_id = ? AND friend_id = ? ORDER BY datetime(created_at) ASC'
      )
      .all(ownerId, friendId) as any[]

    const now = new Date().toISOString()
    const unreadIncoming = rows.filter(r => r.direction === 'incoming' && !r.read_at).map(r => r.id)
    if (unreadIncoming.length > 0) {
      const placeholders = unreadIncoming.map(() => '?').join(',')
      db.prepare(`UPDATE messages SET read_at = ? WHERE id IN (${placeholders})`).run(now, ...unreadIncoming)
      rows.forEach(r => {
        if (unreadIncoming.includes(r.id)) r.read_at = now
      })
    }

    return rows.map(r => ({
      id: r.id,
      owner_id: r.owner_id,
      friend_id: r.friend_id,
      platform: r.platform,
      direction: r.direction,
      body: this.safeDecrypt(r.body_encrypted),
      is_quick: !!r.is_quick,
      created_at: r.created_at,
      read_at: r.read_at,
    }))
  }

  private sendMessage(ownerId: string, friendId: string, platform: string | null, body: string, isQuick: boolean) {
    const db = dbManager.getDb()
    const id = crypto.randomUUID()
    const encrypted = encryptToHex(body)
    const createdAt = new Date().toISOString()

    db.prepare(
      'INSERT INTO messages (id, owner_id, friend_id, platform, direction, body_encrypted, is_quick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, ownerId, friendId, platform, 'outgoing', encrypted, isQuick ? 1 : 0, createdAt)

    return {
      id,
      owner_id: ownerId,
      friend_id: friendId,
      platform,
      direction: 'outgoing',
      body,
      is_quick: isQuick,
      created_at: createdAt,
      read_at: createdAt,
    }
  }

  public getPresence(userId: string): PresenceStatus {
    const db = dbManager.getDb()
    const row = db
      .prepare(
        'SELECT user_id, presence_state, intent_state, intent_metadata, visibility_scope, expires_at, updated_at, source FROM presence_status WHERE user_id = ?'
      )
      .get(userId) as any

    if (!row) {
      const now = new Date().toISOString()
      const status: PresenceStatus = {
        user_id: userId,
        presence_state: 'online',
        intent_state: 'idle',
        intent_metadata: {},
        visibility_scope: 'friends',
        expires_at: null,
        updated_at: now,
        source: 'auto',
      }
      this.savePresence(status)
      return status
    }

    return this.mapRowToPresence(row)
  }

  public setPresence(payload: PresenceUpdateInput): PresenceStatus {
    const db = dbManager.getDb()
    const existingRow = db
      .prepare(
        'SELECT user_id, presence_state, intent_state, intent_metadata, visibility_scope, expires_at, updated_at, source FROM presence_status WHERE user_id = ?'
      )
      .get(payload.userId) as any

    const now = new Date().toISOString()

    if (existingRow && existingRow.source === 'manual' && payload.source === 'auto') {
      return this.mapRowToPresence(existingRow)
    }

    const existing = existingRow ? this.mapRowToPresence(existingRow) : null

    const next: PresenceStatus = {
      user_id: payload.userId,
      presence_state: payload.presence_state || existing?.presence_state || 'online',
      intent_state: payload.intent_state || existing?.intent_state || 'idle',
      intent_metadata: {
        ...(existing?.intent_metadata || {}),
        ...(payload.intent_metadata || {}),
      },
      visibility_scope: payload.visibility_scope || existing?.visibility_scope || 'friends',
      expires_at: payload.expires_at !== undefined ? payload.expires_at || null : existing?.expires_at || null,
      updated_at: now,
      source: payload.source,
    }

    this.applyPresenceBusinessRules(next)
    this.savePresence(next)
    return next
  }

  private mapRowToPresence(row: any): PresenceStatus {
    let metadata: IntentMetadata = {}
    if (row.intent_metadata) {
      try {
        metadata = JSON.parse(row.intent_metadata)
      } catch {
        metadata = {}
      }
    }

    const presenceState: PresenceState =
      row.presence_state === 'offline' ||
      row.presence_state === 'online' ||
      row.presence_state === 'away' ||
      row.presence_state === 'do_not_disturb'
        ? row.presence_state
        : 'online'

    const validIntentStates: IntentState[] = [
      'open_for_coop',
      'looking_for_party',
      'story_mode',
      'competitive',
      'testing_mods',
      'idle',
      'custom',
    ]

    const intentState: IntentState = validIntentStates.includes(row.intent_state) ? row.intent_state : 'idle'

    const visibilityScope: VisibilityScope =
      row.visibility_scope === 'public' ||
      row.visibility_scope === 'friends' ||
      row.visibility_scope === 'favorites' ||
      row.visibility_scope === 'hidden'
        ? row.visibility_scope
        : 'friends'

    const source: 'manual' | 'auto' = row.source === 'manual' ? 'manual' : 'auto'

    return {
      user_id: row.user_id,
      presence_state: presenceState,
      intent_state: intentState,
      intent_metadata: metadata,
      visibility_scope: visibilityScope,
      expires_at: row.expires_at || null,
      updated_at: row.updated_at,
      source,
    }
  }

  private applyPresenceBusinessRules(status: PresenceStatus) {
    const metadata: IntentMetadata = { ...(status.intent_metadata || {}) }

    if (status.intent_state === 'story_mode') {
      metadata.joinable = false
    }

    if (status.intent_state === 'open_for_coop') {
      metadata.joinable = true
    }

    if (status.intent_state === 'testing_mods') {
      metadata.instability_warning = true
    }

    status.intent_metadata = metadata
  }

  private savePresence(status: PresenceStatus) {
    const db = dbManager.getDb()
    const metadataJson = JSON.stringify(status.intent_metadata || {})

    db.prepare(
      `
      INSERT OR REPLACE INTO presence_status (
        user_id,
        presence_state,
        intent_state,
        intent_metadata,
        visibility_scope,
        expires_at,
        updated_at,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      status.user_id,
      status.presence_state,
      status.intent_state,
      metadataJson,
      status.visibility_scope,
      status.expires_at,
      status.updated_at,
      status.source
    )
  }

  private safeDecrypt(payload: string) {
    try {
      return decryptFromHex(payload)
    } catch {
      return ''
    }
  }
}

export const socialService = new SocialService()
