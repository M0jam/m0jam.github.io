import { vi, describe, it, expect } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp'
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))

import { classifyGame, DEFAULT_RULES } from './classification-service'

describe('Classification Logic', () => {
  it('should classify as game by default', () => {
    const game = {
      title: 'Some Random Game',
      metadata: {
        type: 'game',
        genres: ['Action', 'Adventure']
      }
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('game')
  })

  it('should classify as utility if type is not game', () => {
    const game = {
      title: 'Some Software',
      metadata: {
        type: 'software',
        genres: []
      }
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('utility')
    expect(result.reason).toContain('steam_type:software')
  })

  it('should classify as utility if genres include "Utility" (case insensitive)', () => {
    const game = {
      title: 'Helper Tool',
      metadata: {
        type: 'game',
        genres: ['Action', 'Utilities']
      }
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('utility')
    expect(result.reason).toContain('genre:utilities')
  })

  it('should classify as utility if title contains keyword', () => {
    const game = {
      title: 'Wallpaper Engine',
      metadata: {
        type: 'game',
        genres: ['Casual']
      }
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('utility')
    expect(result.reason).toContain('title_keyword')
  })

  it('should classify as utility if executable matches pattern', () => {
    const game = {
      title: 'Unknown App',
      executable_path: 'C:\\Program Files\\Lively Wallpaper\\lively.exe',
      metadata: {
        type: 'game'
      }
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('utility')
    expect(result.reason).toContain('exe_pattern')
  })

  it('should handle JSON string metadata', () => {
    const game = {
      title: 'Tool',
      metadata: JSON.stringify({ type: 'software' })
    }
    const result = classifyGame(game, DEFAULT_RULES)
    expect(result.appType).toBe('utility')
  })
})
