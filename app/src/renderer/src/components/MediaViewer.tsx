import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Link as LinkIcon } from 'lucide-react'
import clsx from 'clsx'

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  items: string[]
  initialIndex?: number
  type?: 'image' | 'video' // Currently mostly for images
}

export function MediaViewer({ isOpen, onClose, items, initialIndex = 0 }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setScale(1)
      setPosition({ x: 0, y: 0 })
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, initialIndex])

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [currentIndex, items.length])

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [currentIndex])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowRight':
        handleNext()
        break
      case 'ArrowLeft':
        handlePrev()
        break
    }
  }, [isOpen, onClose, handleNext, handlePrev])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
        // Zoom
        e.preventDefault()
        const delta = e.deltaY * -0.01
        setScale(prev => Math.min(Math.max(1, prev + delta), 4))
    }
  }

  if (!isOpen) return null
  if (!items || items.length === 0) return null

  const safeIndex = Math.min(Math.max(0, currentIndex), items.length - 1)
  const currentItem = items[safeIndex]

  // Convert thumbnail URLs to full res if needed
  // Pattern: .600x338.jpg -> .1920x1080.jpg or just remove size
  const fullResUrl = currentItem.replace(/\.\d+x\d+/, '.1920x1080')

  return (
    <div 
      className="fixed inset-0 z-[20000] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 focus:outline-none"
      onClick={onClose}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label="Media Viewer"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-[20010] pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg">
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200 active:scale-90 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-white/20"></div>
          <span className="text-white/90 text-sm font-medium tabular-nums">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden"
        onClick={(e) => {
            if (scale > 1) return // Don't close if zoomed (allow panning logic if added)
        }}
      >
        <img 
            src={fullResUrl} 
            alt={`Media ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
            style={{ 
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                cursor: scale > 1 ? 'grab' : 'zoom-in'
            }}
            onClick={toggleZoom}
            draggable={false}
        />
      </div>

      {/* Side Navigation - Visible on Hover/Focus */}
      {items.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={clsx(
              "absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 text-white transition-all duration-200 ease-in-out z-[310] focus:outline-none focus:ring-2 focus:ring-primary-500 group shadow-lg",
              currentIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-0 hover:opacity-100 focus:opacity-100"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform duration-200 ease-in-out" />
          </button>

          <button 
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
            className={clsx(
              "absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/10 text-white transition-all duration-200 ease-in-out z-[310] focus:outline-none focus:ring-2 focus:ring-primary-500 group shadow-lg",
              currentIndex === items.length - 1 ? "opacity-0 pointer-events-none" : "opacity-0 hover:opacity-100 focus:opacity-100"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform duration-200 ease-in-out" />
          </button>
        </>
      )}

      {/* Bottom Control Bar - Consolidated */}
      <div 
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[310] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <>
             <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-95"
                aria-label="Previous image"
                title="Previous"
             >
                <ChevronLeft className="w-5 h-5" />
             </button>
             <div className="w-px h-5 bg-white/10 mx-1"></div>
          </>
        )}

        <button
            onClick={() => setScale(s => Math.max(1, s - 0.5))}
            disabled={scale <= 1}
            className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-95"
            aria-label="Zoom out"
            title="Zoom Out"
        >
            <ZoomOut className="w-5 h-5" />
        </button>

        <span className="text-xs font-mono text-slate-400 min-w-[3rem] text-center tabular-nums">
            {Math.round(scale * 100)}%
        </span>

        <button
            onClick={() => setScale(s => Math.min(4, s + 0.5))}
            disabled={scale >= 4}
            className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-95"
            aria-label="Zoom in"
            title="Zoom In"
        >
            <ZoomIn className="w-5 h-5" />
        </button>

        {items.length > 1 && (
          <>
             <div className="w-px h-5 bg-white/10 mx-1"></div>
             <button
                onClick={handleNext}
                disabled={currentIndex === items.length - 1}
                className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-95"
                aria-label="Next image"
                title="Next"
             >
                <ChevronRight className="w-5 h-5" />
             </button>
          </>
        )}
      </div>

      
      {/* Thumbnails Strip (Optional, maybe for later) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto p-2 scrollbar-hide opacity-0 pointer-events-none">
        {items.map((item, idx) => (
            <button
                key={idx}
                onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(idx)
                    setScale(1)
                }}
                className={clsx(
                    "w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-md overflow-hidden border-2 transition-all",
                    idx === currentIndex ? "border-primary-500 opacity-100 scale-110" : "border-transparent opacity-50 hover:opacity-80"
                )}
            >
                <img src={item} className="w-full h-full object-cover" loading="lazy" />
            </button>
        ))}
      </div>
    </div>
  )
}
