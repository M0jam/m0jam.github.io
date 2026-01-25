import { ipcMain } from 'electron'
import os from 'os'

export class SystemService {
  constructor() {
    this.registerIpcHandlers()
  }

  private registerIpcHandlers() {
    ipcMain.handle('system:get-stats', async () => {
      const cpuUsage = process.getCPUUsage()
      const memoryInfo = process.getSystemMemoryInfo()
      const uptime = process.uptime()
      
      return {
        cpu: cpuUsage,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          appUsage: memoryInfo
        },
        uptime,
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus()
      }
    })
  }
}

export const systemService = new SystemService()
