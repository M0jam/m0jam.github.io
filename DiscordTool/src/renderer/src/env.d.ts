/// <reference types="vite/client" />

interface Window {
  electron: {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>
      send(channel: string, ...args: any[]): void
      on(channel: string, func: (...args: any[]) => void): () => void
      once(channel: string, func: (...args: any[]) => void): void
    }
  }
}
