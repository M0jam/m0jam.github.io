import { dbManager } from '../database'

export class LibraryManager {
  constructor() {}

  async getAllGames() {
    const db = dbManager.getDb()
    return db.prepare('SELECT * FROM games').all()
  }
}

export const libraryManager = new LibraryManager()
