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
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white/80 text-sm font-medium">
          {currentIndex + 1} / {items.length}
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(fullResUrl)
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Copy Link"
            >
                <LinkIcon className="w-5 h-5" />
            </button>
            <a 
                href={fullResUrl} 
                download 
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Open original"
            >
                <Download className="w-5 h-5" />
            </a>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Navigation */}
      {items.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={clsx(
              "absolute left-4 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all z-50",
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            )}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button 
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
            className={clsx(
              "absolute right-4 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all z-50",
              currentIndex === items.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:scale-110"
            )}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Content */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4 md:p-12 overflow-hidden"
        onClick={(e) => {
            if (scale > 1) return // Don't close if zoomed (allow panning logic if added)
            // onClose() // Handled by parent div
        }}
      >
        <img 
            src={fullResUrl} 
            alt={`Media ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ 
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                cursor: scale > 1 ? 'grab' : 'zoom-in'
            }}
            onClick={toggleZoom}
            draggable={false}
        />
      </div>
      
      {/* Thumbnails Strip (Optional, maybe for later) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto p-2 scrollbar-hide">
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
