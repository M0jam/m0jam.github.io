import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { electron } from '../utils/electron'
import { X, Play, Dices, History } from 'lucide-react'
import clsx from 'clsx'

interface WelcomeIntroProps {
  username: string
  onComplete: () => void
  onSelectGame: (gameId: string) => void
}

interface SuggestionData {
  lastPlayed: any | null
  random: any | null
}

export function WelcomeIntro({ username, onComplete, onSelectGame, initialData }: WelcomeIntroProps & { initialData?: SuggestionData }) {
  const { t } = useTranslation()
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(initialData || null)
  const [isVisible, setIsVisible] = useState(true)
  const [step, setStep] = useState<'welcome' | 'content'>('welcome')

  useEffect(() => {
    if (initialData) {
        setSuggestions(initialData)
        return
    }
    const loadSuggestions = async () => {
      try {
        const data = await electron.ipcRenderer.invoke('game:get-intro-suggestions')
        setSuggestions(data)
      } catch (error) {
        console.error('Failed to load intro suggestions:', error)
        handleClose()
      }
    }
    loadSuggestions()
  }, [initialData])

  useEffect(() => {
    if (!suggestions) return

    // Start sequence: Wait 2s then move text up and show games
    const timer = setTimeout(() => {
      setStep('content')
    }, 2500)

    return () => clearTimeout(timer)
  }, [suggestions])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onComplete, 1000) // Allow slower exit animation
  }

  const handleSelect = (gameId: string) => {
    setIsVisible(false)
    setTimeout(() => {
      onSelectGame(gameId)
      onComplete()
    }, 800)
  }

  if (!suggestions) return null

  // If no games installed, skip intro
  if (!suggestions.lastPlayed && !suggestions.random) {
    // Use a timeout to ensure the render cycle completes before calling onComplete
    // which might update state in the parent
    setTimeout(onComplete, 0)
    return null
  }

  return (
    <div 
      className={clsx(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl transition-opacity duration-1000 ease-in-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Dynamic Background from Random Game */}
      {suggestions.random?.box_art_url && (
        <div className="absolute inset-0 z-0 overflow-hidden opacity-20 transition-all duration-[2000ms]">
            <img 
                src={suggestions.random.box_art_url.replace('t_thumb', 't_1080p')} 
                className="w-full h-full object-cover filter blur-3xl scale-110"
                alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/60" />
        </div>
      )}

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        <h1 className={clsx(
          "text-4xl md:text-5xl font-bold text-white text-center tracking-tight transition-all duration-[1500ms] ease-in-out absolute",
          step === 'welcome' ? "translate-y-0 scale-110" : "translate-y-[-200px] scale-100"
        )}>
          {t('intro.welcome', { name: username })}
        </h1>

        <div className={clsx(
          "grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl transition-all duration-[1500ms] ease-out delay-500",
          step === 'content' ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[50px] pointer-events-none"
        )}>
          {/* Random Option */}
          {suggestions.random && (
            <div 
              className="group relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-1 hover:border-primary-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer overflow-hidden shadow-2xl"
              onClick={() => handleSelect(suggestions.random.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90 z-10" />
              <div className="h-64 md:h-80 w-full relative rounded-xl overflow-hidden">
                <img 
                    src={suggestions.random.box_art_url ? suggestions.random.box_art_url.replace('t_thumb', 't_cover_big') : ''} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={suggestions.random.title}
                />
                
                <div className="absolute top-4 left-4 z-20 bg-primary-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                    <Dices className="w-3.5 h-3.5" />
                    {t('intro.suggestion')}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col items-start">
                    <h3 className={clsx(
                        "text-2xl font-bold text-white mb-2 line-clamp-2 drop-shadow-md transition-opacity duration-[3000ms] ease-in-out",
                        step === 'content' ? "opacity-100" : "opacity-0"
                    )}>
                        {suggestions.random.title}
                    </h3>
                    <div className="flex items-center gap-2 text-primary-400 font-medium text-sm">
                        <span>{t('intro.details')}</span>
                        <Play className="w-4 h-4 fill-current" />
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Played Option */}
          {suggestions.lastPlayed && (
            <div 
              className="group relative bg-slate-900/50 border border-slate-700/50 rounded-2xl p-1 hover:border-emerald-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer overflow-hidden shadow-2xl"
              onClick={() => handleSelect(suggestions.lastPlayed.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90 z-10" />
              <div className="h-64 md:h-80 w-full relative rounded-xl overflow-hidden">
                <img 
                    src={suggestions.lastPlayed.box_art_url ? suggestions.lastPlayed.box_art_url.replace('t_thumb', 't_cover_big') : ''} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={suggestions.lastPlayed.title}
                />

                <div className="absolute top-4 left-4 z-20 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                    <History className="w-3.5 h-3.5" />
                    {t('intro.lastPlayed')}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col items-start">
                    <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 drop-shadow-md">{suggestions.lastPlayed.title}</h3>
                    <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                        <span>{t('intro.play')}</span>
                        <Play className="w-4 h-4 fill-current" />
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Skip Button - Appears later */}
        <div className={clsx(
            "absolute bottom-12 transition-all duration-1000 delay-[1500ms]",
            step === 'content' ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            <button 
                onClick={handleClose}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 px-6 py-3 rounded-full hover:bg-slate-800/50 border border-transparent hover:border-slate-700"
            >
                {t('intro.skip')}
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  )
}
