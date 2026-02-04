import React from 'react'
import { WindowControls } from './WindowControls'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TitleBarProps {
  children?: React.ReactNode
}

export function TitleBar({ children }: TitleBarProps) {
  return (
    <div className="fixed top-0 left-0 w-full h-8 z-40 flex items-center justify-between pointer-events-none select-none">
      {/* Background Gradient/Blur for visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      
      {/* Drag Region */}
      <div className="flex-1 h-full pointer-events-auto" style={{ WebkitAppRegion: 'drag' } as any}>
         {children}
      </div>

      {/* Window Controls - Flush Top Right - Above Modals */}
      <div className="pointer-events-auto z-[150]">
        <WindowControls />
      </div>
    </div>
  )
}
