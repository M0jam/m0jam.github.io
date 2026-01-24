import { useEffect, useState } from 'react';

// Define the available theme colors
export const themes = {
  blue: {
    name: 'Blue (Default)',
    colors: {
      400: '96 165 250',  // #60a5fa
      500: '59 130 246',  // #3b82f6
      600: '37 99 235',   // #2563eb
      700: '29 78 216',   // #1d4ed8
    }
  },
  emerald: {
    name: 'Emerald',
    colors: {
      400: '52 211 153',  // #34d399
      500: '16 185 129',  // #10b981
      600: '5 150 105',   // #059669
      700: '4 120 87',    // #047857
    }
  },
  violet: {
    name: 'Violet',
    colors: {
      400: '167 139 250', // #a78bfa
      500: '139 92 246',  // #8b5cf6
      600: '124 58 237',  // #7c3aed
      700: '109 40 217',  // #6d28d9
    }
  },
  rose: {
    name: 'Rose',
    colors: {
      400: '251 113 133', // #fb7185
      500: '244 63 94',   // #f43f5e
      600: '225 29 72',   // #e11d48
      700: '190 18 60',   // #be123c
    }
  },
  amber: {
    name: 'Amber',
    colors: {
      400: '251 191 36',  // #fbbf24
      500: '245 158 11',  // #f59e0b
      600: '217 119 6',   // #d97706
      700: '180 83 9',    // #b45309
    }
  },
  cyan: {
    name: 'Cyan',
    colors: {
      400: '34 211 238',  // #22d3ee
      500: '6 182 212',   // #06b6d4
      600: '8 145 178',   // #0891b2
      700: '14 116 144',  // #0e7490
    }
  }
};

export type ThemeKey = keyof typeof themes;

export function applyTheme(themeKey: ThemeKey) {
  const theme = themes[themeKey] || themes.blue;
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([shade, value]) => {
    root.style.setProperty(`--color-primary-${shade}`, value);
  });
  
  // Also update the glow color for custom effects
  root.style.setProperty('--color-glow', theme.colors[500]);
  
  localStorage.setItem('playhub:theme', themeKey);
}

export const backgrounds = {
  cosmic: {
    name: 'Cosmic (Default)',
    value: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 60%)',
    color: '#020617'
  },
  midnight: {
    name: 'Midnight',
    value: 'linear-gradient(to bottom, #0f172a, #020617)',
    color: '#0f172a'
  },
  deepSpace: {
    name: 'Deep Space',
    value: 'none',
    color: '#000000'
  },
  aurora: {
    name: 'Aurora',
    value: 'linear-gradient(to bottom right, #1e1b4b, #312e81, #1e1b4b)',
    color: '#1e1b4b'
  },
  forest: {
    name: 'Forest',
    value: 'linear-gradient(to bottom, #022c22, #064e3b, #022c22)',
    color: '#022c22'
  },
  sunset: {
    name: 'Sunset',
    value: 'linear-gradient(to bottom right, #4a044e, #7c2d12, #4a044e)',
    color: '#4a044e'
  }
};

export type BackgroundKey = keyof typeof backgrounds;

export function applyBackground(bgKey: BackgroundKey) {
  const bg = backgrounds[bgKey] || backgrounds.cosmic;
  
  // Apply to body
  document.body.style.backgroundImage = bg.value;
  document.body.style.backgroundColor = bg.color;
  document.body.style.backgroundAttachment = 'fixed';
  
  localStorage.setItem('playhub:background', bgKey);
}

