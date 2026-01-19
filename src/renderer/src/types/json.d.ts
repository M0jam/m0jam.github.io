declare module '*.json' {
  const value: any
  export default value
}

declare module 'discord-rpc' {
  export const Client: any
  export function register(clientId: string): void
}
