export interface PlatformConnector {
  platformId: string
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getGames(): Promise<any[]>
  installGame(gameId: string): Promise<void>
  launchGame(gameId: string): Promise<void>
}
