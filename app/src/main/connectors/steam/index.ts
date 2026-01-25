import { PlatformConnector } from '../base-connector'

export class SteamConnector implements PlatformConnector {
  platformId = 'steam'

  async connect(): Promise<boolean> {
    console.log('Connecting to Steam...')
    return true
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from Steam...')
  }

  async getGames(): Promise<any[]> {
    return []
  }

  async installGame(gameId: string): Promise<void> {
    console.log('Installing Steam game:', gameId)
  }

  async launchGame(gameId: string): Promise<void> {
    console.log('Launching Steam game:', gameId)
  }
}
