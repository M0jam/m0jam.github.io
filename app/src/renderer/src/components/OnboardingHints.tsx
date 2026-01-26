import { X, Link, Play, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

interface OnboardingHintsProps {
  stats: {
    total: number
    totalPlaytimeHours: number
  }
  hasTags: boolean
  onDismiss: () => void
}

export function OnboardingHints({ stats, hasTags, onDismiss }: OnboardingHintsProps) {
  const { t } = useTranslation()
  
  const showConnect = stats.total === 0
  const showPlay = stats.total > 0 && stats.totalPlaytimeHours === 0
  const showTags = stats.total > 0 && !hasTags
  
  if (!showConnect && !showPlay && !showTags) return null
  
  return (
    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-900/40 to-slate-900/40 border border-primary-500/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2">
        <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 rounded-full bg-primary-500/20 text-primary-400">
           {showConnect && <Link size={24} />}
           {showPlay && <Play size={24} />}
           {showTags && <Tag size={24} />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{t('onboardingHints.title')}</h3>
          <p className="text-slate-300 text-sm">
            {showConnect && t('onboardingHints.connect')}
            {showPlay && t('onboardingHints.play')}
            {showTags && t('onboardingHints.tags')}
          </p>
          <button 
             onClick={onDismiss}
             className="mt-3 text-xs font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wide"
          >
             {t('onboardingHints.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
