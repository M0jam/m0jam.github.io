import { ipcMain, BrowserWindow, app } from 'electron'
import { dbManager } from '../database'
import { randomUUID } from 'crypto'
import os from 'os'

interface FeedbackPayload {
  type: string
  content: string
  rating?: number
  contactEmail?: string
  sendToDiscord?: boolean
  appVersion?: string
  platform?: string
}

export class FeedbackService {
  private readonly MAX_RETRIES = 3
  private readonly RATE_LIMIT_MS = 60000 // 60 seconds

  constructor() {
    this.registerIpcHandlers()
  }

  private registerIpcHandlers() {
    ipcMain.handle('feedback:submit', async (_, feedback: FeedbackPayload) => {
      return this.submitFeedback(feedback)
    })
  }

  private async checkRateLimit(): Promise<boolean> {
    try {
      const stmt = dbManager.getDb().prepare(`
        SELECT created_at FROM feedback 
        ORDER BY created_at DESC 
        LIMIT 1
      `)
      const lastFeedback = stmt.get() as { created_at: string } | undefined

      if (lastFeedback && lastFeedback.created_at) {
        const lastTime = new Date(lastFeedback.created_at).getTime()
        const timeDiff = Date.now() - lastTime
        if (timeDiff < this.RATE_LIMIT_MS) {
          return false
        }
      }
      return true
    } catch (err) {
      console.error('Rate limit check failed:', err)
      return true // Fail open if DB error
    }
  }

  public async submitFeedback(feedback: FeedbackPayload) {
    // 1. Validation
    if (!feedback.content || feedback.content.trim().length === 0) {
      return { success: false, error: 'Content cannot be empty' }
    }
    if (feedback.content.length > 2000) {
      return { success: false, error: 'Content exceeds 2000 characters' }
    }
    
    // Sanitize content (prevent @everyone / @here abuse)
    const sanitizedContent = feedback.content.replace(/@(everyone|here)/g, '@\u200b$1')


    // 2. Rate Limit
    const allowed = await this.checkRateLimit()
    if (!allowed) {
      return { success: false, error: 'Please wait 60 seconds between feedback submissions.' }
    }

    const id = randomUUID()
    const timestamp = new Date().toISOString()
    
    // 3. Persist to DB (Queue)
    try {
      const stmt = dbManager.getDb().prepare(`
        INSERT INTO feedback (id, type, content, rating, contact_email, status, created_at, sync_status, retry_count)
        VALUES (@id, @type, @content, @rating, @contactEmail, 'open', @createdAt, 'pending', 0)
      `)

      stmt.run({
        id,
        type: feedback.type,
        content: sanitizedContent,
        rating: feedback.rating || null,
        contactEmail: feedback.contactEmail || null,
        createdAt: timestamp
      })
    } catch (err) {
      console.error('Failed to save feedback locally:', err)
      return { success: false, error: 'Internal database error' }
    }

    // 4. Send to Discord (if enabled)
    // Even if sendToDiscord is false, we saved it locally.
    // But the requirement implies we should try to send it if enabled.
    let remoteStatus: 'sent' | 'failed' | 'skipped' = 'skipped'
    let remoteError: string | null = null

    if (feedback.sendToDiscord) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.VITE_FEEDBACK_WEBHOOK_URL
      
      if (!webhookUrl) {
        remoteStatus = 'failed'
        remoteError = 'No Discord Webhook URL configured'
        console.warn('Feedback submission: No Webhook URL configured')
      } else {
        try {
          await this.sendToDiscordWithRetry(webhookUrl, { ...feedback, content: sanitizedContent }, id, timestamp)
          remoteStatus = 'sent'
          this.updateSyncStatus(id, 'synced')
        } catch (err: any) {
          remoteStatus = 'failed'
          remoteError = err.message
          this.updateSyncStatus(id, 'failed')
          console.error('Failed to send feedback to Discord:', err)
        }
      }
    }

    // 5. Notify User
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (remoteStatus === 'sent' || remoteStatus === 'skipped') {
        win.webContents.send('notification:new', {
          title: 'Feedback Received',
          body: 'Thank you for helping us improve PlayHub!'
        })
      } else {
        win.webContents.send('notification:new', {
          title: 'Feedback Saved',
          body: 'We saved your feedback locally and will try to send it later.'
        })
      }
    }

    return {
      success: true,
      id,
      remoteStatus,
      remoteError
    }
  }

  private updateSyncStatus(id: string, status: 'synced' | 'failed') {
    try {
      const stmt = dbManager.getDb().prepare(`
        UPDATE feedback SET sync_status = @status WHERE id = @id
      `)
      stmt.run({ status, id })
    } catch (err) {
      console.error('Failed to update sync status:', err)
    }
  }

  private async sendToDiscordWithRetry(url: string, feedback: FeedbackPayload, id: string, timestamp: string) {
    let attempt = 0
    let lastError: any

    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      version: app.getVersion()
    }

    const payload = {
      username: 'PlayHub Feedback',
      avatar_url: 'https://github.com/TraeAI.png', // Placeholder or App Icon
      embeds: [
        {
          title: `User Feedback: ${feedback.type.toUpperCase()}`,
          description: feedback.content,
          color: feedback.type === 'bug' ? 15158332 : 3066993, // Red for bug, Green for others
          fields: [
            {
              name: 'Rating',
              value: feedback.rating ? '⭐'.repeat(feedback.rating) : 'N/A',
              inline: true
            },
            {
              name: 'App Version',
              value: systemInfo.version,
              inline: true
            },
            {
              name: 'Platform',
              value: `${systemInfo.platform} ${systemInfo.release} (${systemInfo.arch})`,
              inline: true
            },
            {
              name: 'Contact',
              value: feedback.contactEmail || 'Anonymous',
              inline: true
            },
            {
              name: 'ID',
              value: id,
              inline: true
            }
          ],
          footer: {
            text: `PlayHub Feedback System • ${timestamp}`
          }
        }
      ]
    }

    while (attempt < this.MAX_RETRIES) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }

        if (process.env.APP_SECRET) {
          headers['X-App-Token'] = process.env.APP_SECRET
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          // Rate limit handling (Discord returns 429)
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 5000
            await new Promise(resolve => setTimeout(resolve, waitMs))
            continue // Retry immediately after wait
          }
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        return // Success
      } catch (err) {
        lastError = err
        attempt++
        console.warn(`Feedback attempt ${attempt} failed:`, err)
        
        // Exponential backoff: 1s, 2s, 4s
        if (attempt < this.MAX_RETRIES) {
          const backoff = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, backoff))
        }
      }
    }

    throw lastError
  }
}

export const feedbackService = new FeedbackService()
