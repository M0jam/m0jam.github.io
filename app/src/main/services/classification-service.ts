import { ipcMain, app } from 'electron'
import { dbManager } from '../database'
import log from 'electron-log'
import { join } from 'path'
import fs from 'fs'

type AppType = 'game' | 'utility'

interface ClassificationRules {
  keywordGame: string[]
  keywordUtility: string[]
  steamTypeUtility: string[]
  exePatternsUtility: string[]
  thresholds: { utility: number; game: number }
}

export const DEFAULT_RULES: ClassificationRules = {
  keywordGame: ['edition', 'remastered', 'dlc', 'season', 'chapter', 'episode', 'definitive'],
  keywordUtility: [
    'utility',
    'utilities',
    'software',
    'tool',
    'overlay',
    'benchmark',
    'monitor',
    'optimizer',
    'rainmeter',
    'wallpaper',
    'background',
    'translucent',
    'theme',
    'skin',
    'afterburner',
    'soundpad',
    'lively'
  ],
  steamTypeUtility: ['software', 'tool', 'application', 'video', 'demo'],
  exePatternsUtility: [
    'rainmeter.exe',
    'wallpaper64.exe',
    'wallpaper32.exe',
    'wallpaperengine.exe',
    'lively.exe',
    'msi afterburner.exe',
    'msiafterburner.exe',
    'soundpad.exe',
    'processhacker.exe',
    'translucenttb.exe',
    'cpu-z.exe',
    'gpu-z.exe',
    'ccleaner.exe'
  ],
  thresholds: { utility: 0.6, game: 0.4 }
}

export function classifyGame(game: any, rules: ClassificationRules): { appType: AppType; confidence: number; reason: string } {
  const normalizeText = (text?: string) => (text || '').toLowerCase()
  
  const title = normalizeText(game.title)
  const metadata = typeof game.metadata === 'string' ? safeJson(game.metadata) : (game.metadata || {})
  const type = normalizeText(metadata?.type)
  const genres: string[] = Array.isArray(metadata?.genres) ? metadata.genres : []
  const genresText = genres.map((g) => normalizeText(g))
  const exe = normalizeText(game.executable_path)

  let utilityScore = 0
  let gameScore = 0
  const reasons: string[] = []

  // Steam type signal
  if (type && rules.steamTypeUtility.includes(type)) {
    utilityScore += 0.7
    reasons.push(`steam_type:${type}`)
  }

  // Genre signals
  for (const g of genresText) {
    if (rules.keywordUtility.some((k) => g.includes(k))) {
      utilityScore += 0.4
      reasons.push(`genre:${g}`)
    }
  }

  // Title keywords
  if (rules.keywordUtility.some((k) => title.includes(k))) {
    utilityScore += 0.6
    reasons.push(`title_keyword`)
  }
  if (rules.keywordGame.some((k) => title.includes(k))) {
    gameScore += 0.2
    reasons.push(`title_game_keyword`)
  }

  // Executable patterns
  if (exe && rules.exePatternsUtility.some((p) => exe.includes(p))) {
    utilityScore += 0.6
    reasons.push(`exe_pattern`)
  }

  // HLTB presence hints game
  if (game.hltb_main || game.hltb_extra || game.hltb_completionist) {
    gameScore += 0.4
    reasons.push('hltb_present')
  }

  // Installed path hints
  const installPath = normalizeText(game.install_path)
  if (installPath && installPath.includes('steamapps/common')) {
    gameScore += 0.1
  }

  // Clamp and decide
  const utilityConfidence = Math.min(1, utilityScore)
  const gameConfidence = Math.min(1, gameScore)
  const decidedUtility = utilityConfidence >= rules.thresholds.utility && utilityConfidence >= gameConfidence
  const appType: AppType = decidedUtility ? 'utility' : 'game'
  const confidence = decidedUtility ? utilityConfidence : gameConfidence
  const reason = reasons.join(',')

  return { appType, confidence, reason }
}

export class ClassificationService {
  public rules: ClassificationRules = DEFAULT_RULES
  private rulesPath: string

  constructor() {
    this.rulesPath = join(app.getPath('userData'), 'classification_rules.json')
    this.loadRules()
    this.registerIpc()
    log.info('[Classification] Initialized')
  }

  private registerIpc() {
    ipcMain.handle('classification:get-rules', async () => this.rules)
    ipcMain.handle('classification:update-rules', async (_, rules: Partial<ClassificationRules>) => {
      this.updateRules(rules)
      await this.reclassifyAll()
      return true
    })
    ipcMain.handle('classification:reclassify-all', async () => {
      await this.reclassifyAll()
      return true
    })
    ipcMain.handle('classification:set-override', async (_, { gameId, appType }: { gameId: string; appType: AppType | 'auto' }) => {
      const db = dbManager.getDb()
      if (appType === 'auto') {
        db.prepare('UPDATE games SET user_override_app_type = NULL WHERE id = ?').run(gameId)
      } else {
        db.prepare('UPDATE games SET user_override_app_type = ? WHERE id = ?').run(appType, gameId)
      }
      await this.applyClassification(gameId)
      return true
    })
  }

  private loadRules() {
    try {
      if (fs.existsSync(this.rulesPath)) {
        const data = JSON.parse(fs.readFileSync(this.rulesPath, 'utf-8'))
        this.rules = { ...DEFAULT_RULES, ...data }
        log.info('[Classification] Loaded rules from disk')
      }
    } catch (e) {
      log.error('[Classification] Failed to load rules:', e)
    }
  }

  private saveRules() {
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2), 'utf-8')
      log.info('[Classification] Rules saved')
    } catch (e) {
      log.error('[Classification] Failed to save rules:', e)
    }
  }

  updateRules(rules: Partial<ClassificationRules>) {
    this.rules = {
      ...this.rules,
      ...rules,
      thresholds: rules.thresholds ? rules.thresholds : this.rules.thresholds
    }
    this.saveRules()
  }

  classify(game: any): { appType: AppType; confidence: number; reason: string } {
    return classifyGame(game, this.rules)
  }

  async applyClassification(gameId: string): Promise<void> {
    this.runClassification(gameId)
  }

  private runClassification(gameId: string): void {
    const db = dbManager.getDb()
    let game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any
    if (!game) return

    if (typeof game.metadata === 'string') {
      try {
        game.metadata = JSON.parse(game.metadata)
      } catch {
        game.metadata = {}
      }
    }

    if (game.user_override_app_type === 'game' || game.user_override_app_type === 'utility') {
      const oldType = game.app_type
      db.prepare('UPDATE games SET app_type = ?, classification_confidence = ?, classification_reason = ? WHERE id = ?').run(
        game.user_override_app_type,
        1.0,
        `Manual override to ${game.user_override_app_type}`,
        gameId
      )
      
      // Log decision
      db.prepare('INSERT INTO classification_log (game_id, old_type, new_type, confidence, reason, source) VALUES (?, ?, ?, ?, ?, ?)').run(
        gameId,
        oldType,
        game.user_override_app_type,
        1.0,
        `Manual override to ${game.user_override_app_type}`,
        'manual'
      )
      
      log.info(`[Classification] Applied manual override for ${gameId}`)
      return
    }

    const result = this.classify(game)
    const oldType = game.app_type
    
    db.prepare('UPDATE games SET app_type = ?, classification_confidence = ?, classification_reason = ? WHERE id = ?').run(
      result.appType,
      result.confidence,
      result.reason,
      gameId
    )
    
    db.prepare('INSERT INTO classification_log (game_id, old_type, new_type, confidence, reason, source) VALUES (?, ?, ?, ?, ?, ?)').run(
      gameId,
      oldType,
      result.appType,
      result.confidence,
      result.reason,
      'auto'
    )

    log.info(`[Classification] ${game.title} -> ${result.appType} (${(result.confidence * 100).toFixed(0)}%) [${result.reason}]`)
  }

  async reclassifyAll(): Promise<void> {
    const db = dbManager.getDb()
    const games = db.prepare('SELECT id FROM games').all() as any[]
    const tx = db.transaction((ids: any[]) => {
      for (const g of ids) {
        this.runClassification(g.id)
      }
    })
    tx(games)
  }
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

export const classificationService = new ClassificationService()
