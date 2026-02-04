import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Gamepad2, Clock, Search, LogOut, Power, Volume2, VolumeX } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { electron } from '../utils/electron'
import { soundManager } from '../utils/sound'
import { Logo } from './Logo'

interface CouchOverlayProps {
  games: any[]
  onPlay: (gameId: string) => void
  onClose: () => void
  visible: boolean
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
}

export function CouchOverlay({ games, onPlay, onClose, visible }: CouchOverlayProps) {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  
  // Manage Intro State and Sound
  useEffect(() => {
    if (visible) {
      setShowIntro(true)
      soundManager.setEnabled(true)
      // Play startup sound after a short delay to allow context to resume
      const timer = setTimeout(() => {
        soundManager.playStartup()
      }, 300)
      
      // End intro after animation
      const introTimer = setTimeout(() => {
        setShowIntro(false)
      }, 2500)

      return () => {
        clearTimeout(timer)
        clearTimeout(introTimer)
      }
    } else {
      soundManager.setEnabled(false)
    }
  }, [visible])

  // Update volume
  useEffect(() => {
    soundManager.setVolume(isMuted ? 0 : volume)
  }, [volume, isMuted])

  // Filter games based on search
  const filteredGames = useMemo(() => {
    if (!searchQuery) return games
    const lower = searchQuery.toLowerCase()
    return games.filter(g => g.title.toLowerCase().includes(lower))
  }, [games, searchQuery])

  // Reset selection when games change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredGames.length])

  // Keyboard navigation
  useEffect(() => {
    if (!visible || showIntro) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundManager.playBack()
        onClose()
        return
      }

      const cols = 4 // Approximate columns in grid
      let newIndex = selectedIndex
      
      if (e.key === 'ArrowRight') {
        newIndex = Math.min(selectedIndex + 1, filteredGames.length - 1)
      } else if (e.key === 'ArrowLeft') {
        newIndex = Math.max(selectedIndex - 1, 0)
      } else if (e.key === 'ArrowDown') {
        newIndex = Math.min(selectedIndex + cols, filteredGames.length - 1)
      } else if (e.key === 'ArrowUp') {
        newIndex = Math.max(selectedIndex - cols, 0)
      } else if (e.key === 'Enter') {
        if (filteredGames[selectedIndex]) {
          soundManager.playSelect()
          onPlay(filteredGames[selectedIndex].id)
        }
        return
      }

      if (newIndex !== selectedIndex) {
        soundManager.playNav()
        setSelectedIndex(newIndex)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, showIntro, filteredGames, selectedIndex, onClose, onPlay])

  // Ensure selected game is visible
  useEffect(() => {
    if (!visible) return
    const el = document.getElementById(`couch-game-${selectedIndex}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedIndex, visible])

  const handleQuitApp = async () => {
    await electron.ipcRenderer.invoke('window:close')
  }

  const selectedGame = filteredGames[selectedIndex]

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="couch-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col overflow-hidden font-sans select-none"
        >
           {/* Intro Sequence */}
           <AnimatePresence>
            {showIntro && (
              <motion.div 
                className="absolute inset-0 z-[250] flex items-center justify-center bg-slate-950"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [0.8, 1.2, 1], 
                    opacity: 1,
                    filter: ["blur(10px)", "blur(0px)"]
                  }}
                  transition={{ duration: 1.2, times: [0, 0.6, 1], ease: "easeOut" }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary-500 blur-3xl opacity-20 rounded-full scale-150 animate-pulse" />
                    <Logo className="w-32 h-32 text-white relative z-10" />
                  </div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="text-4xl font-bold tracking-[0.2em] text-white uppercase"
                  >
                    PlayHub
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0, duration: 0.5 }}
                    className="text-primary-400 font-medium tracking-widest text-sm uppercase"
                  >
                    Couch Mode
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
           </AnimatePresence>

          {/* Background Ambient */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              {selectedGame?.box_art_url && (
                <motion.img
                  key={selectedGame.id}
                  src={selectedGame.box_art_url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 w-full h-full object-cover filter blur-[100px] scale-125"
                />
              )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-slate-950/60" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020617_100%)] opacity-80" />
          </div>

          {/* Header */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: showIntro ? 2.2 : 0, duration: 0.5 }}
            className="relative z-10 p-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                <Gamepad2 size={40} className="text-primary-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">Library</h1>
                <p className="text-slate-400 text-lg font-medium">
                  {filteredGames.length} <span className="text-slate-600">|</span> {t('app.sidebar.allGames', 'Games')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-full border border-white/10 backdrop-blur-md shadow-xl transition-all focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20">
                <Search className="text-slate-400" size={24} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-xl placeholder:text-slate-600 w-64 text-white font-medium"
                  autoFocus={!showIntro}
                />
              </div>
              
              <div className="h-10 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-4">
                 {/* Volume Control */}
                 <div className="flex items-center gap-3 bg-black/40 hover:bg-white/10 p-3 rounded-full px-5 transition-all border border-white/5 hover:border-white/20">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 group-hover:text-white transition-colors">
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                            setVolume(parseInt(e.target.value))
                            setIsMuted(false)
                        }}
                        className="w-24 accent-primary-500 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <button
                    onClick={() => {
                      soundManager.playBack()
                      onClose()
                    }}
                    className="p-4 rounded-full bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-all border border-white/10 hover:scale-105 active:scale-95"
                    title="Exit Couch Mode"
                  >
                    <LogOut size={24} />
                  </button>

                  <button
                    onClick={handleQuitApp}
                    className="p-4 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/20 hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    title="Quit PlayHub"
                  >
                    <Power size={24} />
                  </button>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="relative z-10 flex-1 flex overflow-hidden">
            {/* Game Grid */}
            <div className="flex-1 overflow-y-auto p-12 pt-4 no-scrollbar">
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate={showIntro ? "hidden" : "visible"}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-40"
              >
                {filteredGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    variants={itemVariants}
                    id={`couch-game-${index}`}
                    layoutId={`game-${game.id}`}
                    onClick={() => {
                      soundManager.playNav()
                      setSelectedIndex(index)
                      soundManager.playSelect()
                      onPlay(game.id)
                    }}
                    className={clsx(
                      "aspect-[2/3] rounded-2xl relative overflow-hidden transition-all duration-300 transform shadow-2xl",
                      selectedIndex === index 
                        ? "ring-4 ring-primary-500 scale-110 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
                        : "opacity-70 scale-100 hover:opacity-100 hover:scale-105 grayscale-[30%] hover:grayscale-0"
                    )}
                  >
                    {game.box_art_url ? (
                      <img src={game.box_art_url} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center p-6 text-center bg-gradient-to-br from-slate-800 to-slate-900">
                        <span className="text-xl font-bold text-slate-500">{game.title}</span>
                      </div>
                    )}
                    
                    {/* Selection Border Glow */}
                    {selectedIndex === index && (
                       <motion.div 
                         layoutId="selection-glow"
                         className="absolute inset-0 rounded-2xl ring-4 ring-primary-400/50 shadow-[0_0_30px_rgba(var(--color-primary-500),0.4)]" 
                         transition={{ duration: 0.2 }}
                       />
                    )}

                    {/* Info Overlay (Only visible when selected) */}
                    <div className={clsx(
                      "absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-5 transition-opacity duration-300",
                      selectedIndex === index ? "opacity-100" : "opacity-0"
                    )}>
                      <h3 className="text-2xl font-bold text-white drop-shadow-md line-clamp-2 leading-tight mb-2">
                        {game.title}
                      </h3>
                      {game.hltb_main > 0 && (
                        <div className="flex items-center gap-2 text-primary-300 text-sm font-bold tracking-wide uppercase bg-black/40 w-fit px-2 py-1 rounded-md border border-white/10 backdrop-blur-sm">
                          <Clock size={14} />
                          <span>{Math.round(game.hltb_main / 3600)}h Main</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
          
          {/* Footer Controls Hint */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: showIntro ? 2.5 : 0.5, duration: 0.5 }}
            className="relative z-10 p-8 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-16 text-slate-400 text-sm uppercase tracking-[0.2em] font-bold"
          >
             <div className="flex items-center gap-3 group">
                <span className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full border border-white/10 group-hover:bg-primary-500/20 group-hover:text-primary-400 group-hover:border-primary-500/50 transition-all">
                  <Gamepad2 size={16} />
                </span>
                <span>Navigate</span>
             </div>
             <div className="flex items-center gap-3 group">
                <span className="px-3 py-1 bg-white/10 rounded-lg border border-white/10 group-hover:bg-primary-500/20 group-hover:text-primary-400 group-hover:border-primary-500/50 transition-all">Enter</span>
                <span>Play</span>
             </div>
             <div className="flex items-center gap-3 group">
                <span className="px-3 py-1 bg-white/10 rounded-lg border border-white/10 group-hover:bg-primary-500/20 group-hover:text-primary-400 group-hover:border-primary-500/50 transition-all">Esc</span>
                <span>Back</span>
             </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
