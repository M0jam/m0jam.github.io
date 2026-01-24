import React, { createContext, useContext, useEffect, useState } from 'react'
import { themes, applyTheme, ThemeKey, backgrounds, applyBackground, BackgroundKey } from '../utils/theme'

type ThemeMode = 'dark' | 'light'

interface ThemeContextType {
  theme: ThemeMode
  toggleTheme: () => void
  colorTheme: ThemeKey
  setColorTheme: (key: ThemeKey) => void
  backgroundTheme: BackgroundKey
  setBackgroundTheme: (key: BackgroundKey) => void
  availableThemes: typeof themes
  availableBackgrounds: typeof backgrounds
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as ThemeMode) || 'dark'
  })

  const [colorTheme, setColorThemeState] = useState<ThemeKey>('blue')
  const [backgroundTheme, setBackgroundThemeState] = useState<BackgroundKey>('cosmic')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Restore Color Theme
    const savedColor = localStorage.getItem('playhub:theme') as ThemeKey
    if (savedColor && themes[savedColor]) {
      setColorThemeState(savedColor)
      applyTheme(savedColor)
    } else {
      applyTheme('blue')
    }

    // Restore Background Theme
    const savedBg = localStorage.getItem('playhub:background') as BackgroundKey
    if (savedBg && backgrounds[savedBg]) {
      setBackgroundThemeState(savedBg)
      applyBackground(savedBg)
    } else {
      applyBackground('cosmic')
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setColorTheme = (key: ThemeKey) => {
    setColorThemeState(key)
    applyTheme(key)
  }

  const setBackgroundTheme = (key: BackgroundKey) => {
    setBackgroundThemeState(key)
    applyBackground(key)
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      colorTheme, 
      setColorTheme,
      backgroundTheme,
      setBackgroundTheme,
      availableThemes: themes,
      availableBackgrounds: backgrounds
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
