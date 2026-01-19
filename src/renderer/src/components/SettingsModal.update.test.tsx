import { describe, it, expect } from 'vitest'
import { shouldShowUpdateDialog, hasUnreadChangelog } from './SettingsModal'

describe('update helpers', () => {
  describe('shouldShowUpdateDialog', () => {
    it('returns false when there is no available version', () => {
      expect(shouldShowUpdateDialog(null, null)).toBe(false)
      expect(shouldShowUpdateDialog('1.0.0', null)).toBe(false)
    })

    it('returns true when user has never been prompted for this version', () => {
      expect(shouldShowUpdateDialog(null, '1.1.0')).toBe(true)
    })

    it('returns false when user was already prompted for this version', () => {
      expect(shouldShowUpdateDialog('1.1.0', '1.1.0')).toBe(false)
    })

    it('returns true when available version changed', () => {
      expect(shouldShowUpdateDialog('1.1.0', '1.2.0')).toBe(true)
    })
  })

  describe('hasUnreadChangelog', () => {
    it('returns false when current version is missing', () => {
      expect(hasUnreadChangelog(null, null)).toBe(false)
      expect(hasUnreadChangelog('1.0.0', null)).toBe(false)
    })

    it('returns true when user never saw any changelog', () => {
      expect(hasUnreadChangelog(null, '1.0.0')).toBe(true)
    })

    it('returns false when user already saw changelog for current version', () => {
      expect(hasUnreadChangelog('1.0.0', '1.0.0')).toBe(false)
    })

    it('returns true when app was updated and changelog is new', () => {
      expect(hasUnreadChangelog('1.0.0', '1.1.0')).toBe(true)
    })
  })
})
