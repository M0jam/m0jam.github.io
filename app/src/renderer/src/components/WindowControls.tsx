import React, { useEffect, useState } from 'react'
import { electron } from '../utils/electron'
import { Minus, Square, X } from 'lucide-react'
import clsx from 'clsx'

interface WindowControlsProps {
  className?: string
}

export function WindowControls({ className }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const max = await electron.ipcRenderer.invoke('window:is-maximized')
        setIsMaximized(max)
      } catch (e) {
        console.error('Failed to check maximized state', e)
      }
    }

    checkMaximized()

    const handleResize = () => {
      checkMaximized()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMinimize = () => electron.ipcRenderer.invoke('window:minimize')

  const handleMaximize = async () => {
    await electron.ipcRenderer.invoke('window:maximize')
    const max = await electron.ipcRenderer.invoke('window:is-maximized')
    setIsMaximized(max)
  }
  
  const handleClose = () => electron.ipcRenderer.invoke('window:close')

  return (
    <div className={clsx("flex items-center h-8 z-[10000]", className)} style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          className="w-10 h-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus:outline-none rounded-md"
          tabIndex={-1}
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus:outline-none rounded-md"
          tabIndex={-1}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
             <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5v9h9V5H3zm8 8H4V6h7v7z"/>
                <path fillRule="evenodd" d="M5 5h1V4h7v7h-1v1h2V3H5v2z"/>
             </svg>
          ) : (
            <Square size={12} />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-full hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-slate-400 focus:outline-none rounded-md"
          tabIndex={-1}
          aria-label="Close"
        >
          <X size={16} />
        </button>
    </div>
  )
}
