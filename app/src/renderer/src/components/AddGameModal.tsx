import React, { useState } from 'react'
import { X, FolderOpen, Plus, Image as ImageIcon, Gamepad2 } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { electron } from '../utils/electron'

interface AddGameModalProps {
  isOpen: boolean
  onClose: () => void
  onGameAdded: () => void
}

export function AddGameModal({ isOpen, onClose, onGameAdded }: AddGameModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [executablePath, setExecutablePath] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBrowse = async () => {
    try {
      const path = await electron.ipcRenderer.invoke('dialog:open-file', [
        { name: 'Executables', extensions: ['exe', 'lnk', 'url', 'bat', 'cmd'] }
      ])
      if (path) {
        setExecutablePath(path)
        // Auto-fill title from filename if empty
        if (!title) {
          const filename = path.split('\\').pop()?.split('/').pop()?.replace(/\.(exe|lnk|url|bat|cmd)$/i, '')
          if (filename) setTitle(filename)
        }
      }
    } catch (err) {
      console.error('Failed to open file dialog', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !executablePath) {
      setError(t('addGame.errorMissingFields'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await electron.ipcRenderer.invoke('game:add-custom', {
        title,
        executablePath,
        imageUrl: imageUrl || undefined
      })
      
      // Reset form
      setTitle('')
      setExecutablePath('')
      setImageUrl('')
      
      onGameAdded()
      onClose()
    } catch (err: any) {
      console.error('Failed to add game:', err)
      setError(err.message || t('addGame.errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-400" />
            {t('addGame.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{t('addGame.gameTitleLabel')}</label>
            <div className="relative">
              <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('addGame.gameTitlePlaceholder')}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{t('addGame.executableLabel')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={executablePath}
                  onChange={(e) => setExecutablePath(e.target.value)}
                  placeholder={t('addGame.executablePlaceholder')}
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleBrowse}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                {t('addGame.browse')}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t('addGame.executableHelp')}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{t('addGame.coverLabel')}</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t('addGame.coverPlaceholder')}
                className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>
            {imageUrl && (
              <div className="mt-2 w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-black/40 relative group">
                <img 
                  src={imageUrl} 
                  alt={t('addGame.preview')} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = ''
                    // Could set error state here if needed
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <span className="bg-black/60 px-2 py-1 rounded text-xs text-white">{t('addGame.preview')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              {t('addGame.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !executablePath}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? t('addGame.submitting') : t('addGame.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
