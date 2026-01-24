import { useState } from 'react'
import clsx from 'clsx'

interface GameCardProps {
  game: {
    id: string
    title: string
    box_art_url?: string
    is_favorite: boolean
    is_installed?: boolean
    platform_game_id: string // Need this for Steam fallback
    status_tag?: string | null
  }
  onToggleFavorite: (id: string) => void
  onClick: (id: string) => void
  onChangeStatus?: (id: string, status: string | null) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function GameCard({ game, onToggleFavorite, onClick, onChangeStatus, onMouseEnter, onMouseLeave }: GameCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imgSrc, setImgSrc] = useState(game.box_art_url)
  const [isLoading, setIsLoading] = useState(!!game.box_art_url)
  
  const isInstalled = !!game.is_installed

  const handleImageError = () => {
    // If the primary image fails, we can try fallbacks based on platform ID
    // For now, if it fails, we just show the placeholder
    // In a more advanced version, we could try a list of URLs
    
    // Attempt fallback for Steam games if the first URL fails
    if (!imageError && game.id.startsWith('steam_')) {
        // If the shared.akamai URL failed, try the steamcdn-a one
        // Note: The original URL in DB might be either. 
        // We can just try the alternative if the current one isn't it.
        const appId = game.platform_game_id
        const altUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900.jpg`
        
        if (imgSrc !== altUrl) {
            setImgSrc(altUrl)
            return // Don't set error yet, try the new URL
        }
    }

    setImageError(true)
  }

  return (
    <div 
        onClick={() => onClick(game.id)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="aspect-[2/3] w-full mx-auto bg-slate-900 rounded-xl cursor-pointer border border-white/5 shadow-lg relative overflow-hidden group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(var(--color-primary-500),0.3)] hover:border-primary-500/30"
    >
      {/* Sheen effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />

      {!imageError && imgSrc ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 bg-slate-900/80 animate-pulse" aria-hidden="true" />
          )}
          <img 
              src={imgSrc} 
              alt={game.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
              onError={handleImageError}
              onLoad={() => setIsLoading(false)}
              loading="lazy"
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-900 p-4 text-center">
            <span className="text-4xl font-bold mb-2 opacity-20">{game.title[0]}</span>
            <span className="text-xs font-medium line-clamp-2 px-2">{game.title}</span>
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          {onChangeStatus && (
            <div className="absolute top-2 left-2">
              <select
                value={game.status_tag || ''}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  const value = e.target.value || null
                  onChangeStatus(game.id, value)
                }}
                className="text-[10px] bg-slate-900/90 border border-slate-700 rounded-full px-2 py-0.5 text-slate-200 focus:outline-none backdrop-blur-md hover:bg-slate-800"
              >
                <option value="">No status</option>
                <option value="Backlog">Backlog</option>
                <option value="Playing">Playing</option>
                <option value="Completed">Completed</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>
          )}
          
          <button 
             onClick={(e) => { e.stopPropagation(); onToggleFavorite(game.id) }}
             className={clsx("absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md transition-all z-30", game.is_favorite ? "text-red-500 bg-slate-900/80 shadow-lg" : "text-slate-300 bg-slate-900/60 hover:bg-slate-900/90 hover:text-white")}
             title={game.is_favorite ? "Remove from favorites" : "Add to favorites"}
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={game.is_favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
           </button>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-primary-600/90 text-white flex items-center justify-center shadow-lg shadow-primary-600/40 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-bold text-sm leading-tight text-center drop-shadow-md transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{game.title}</h3>
              {game.is_installed && (
                  <div className="flex justify-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">Installed</span>
                  </div>
              )}
          </div>
      </div>
      
      {/* Default overlay for readability if needed, but we rely on group-hover for cleaner look */}
    </div>
  )
}
