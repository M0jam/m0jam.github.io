import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

// Ensure userData path is available (app must be ready or we use a fallback for dev if needed, 
// but usually this is imported after app is ready or inside a function)
// To be safe, we can initialize lazily or inside constructor.
// For now, we assume this module is imported after app setup or we just use app.getPath safely.

export class DatabaseManager {
  private db: Database.Database | null = null

  constructor() {
    // We defer initialization to ensure app.getPath is ready if needed, 
    // but usually app.getPath('userData') works early.
  }

  public init() {
    const dbPath = join(app.getPath('userData'), 'playhub.db')
    console.log('Database path:', dbPath)
    
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')

    this.runMigrations()
  }

  private runMigrations() {
    if (!this.db) return

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        username TEXT,
        auth_data TEXT,
        status TEXT DEFAULT 'offline',
        last_synced DATETIME
      );

      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        platform_game_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        title TEXT NOT NULL,
        normalized_title TEXT NOT NULL, -- For searching/deduplication
        version TEXT,
        install_path TEXT,
        executable_path TEXT,
        box_art_url TEXT,
        background_url TEXT,
        metadata JSON, -- Developer, Publisher, Release Date
        playtime_seconds INTEGER DEFAULT 0,
        last_played DATETIME,
        is_installed BOOLEAN DEFAULT 0,
        is_favorite BOOLEAN DEFAULT 0,
        FOREIGN KEY(account_id) REFERENCES accounts(id)
      );

      CREATE TABLE IF NOT EXISTS play_sessions (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration_seconds INTEGER,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_tags (
        game_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (game_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS game_notes (
        game_id TEXT PRIMARY KEY,
        content TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        friend_id TEXT NOT NULL,
        platform TEXT,
        direction TEXT NOT NULL,
        body_encrypted TEXT NOT NULL,
        is_quick INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY(owner_id) REFERENCES users(id),
        FOREIGN KEY(friend_id) REFERENCES friends(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS presence_status (
        user_id TEXT PRIMARY KEY,
        presence_state TEXT NOT NULL,
        intent_state TEXT NOT NULL,
        intent_metadata TEXT,
        visibility_scope TEXT NOT NULL,
        expires_at DATETIME,
        updated_at DATETIME NOT NULL,
        source TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      -- User Profiles (Local Auth)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, -- In a real app, use argon2/bcrypt. Here simple hash for demo.
        username TEXT NOT NULL,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Friends System
      CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL, -- 'playhub', 'steam', etc.
        external_id TEXT,
        username TEXT NOT NULL,
        avatar_url TEXT,
        status TEXT DEFAULT 'offline', -- 'online', 'in-game', 'offline'
        game_activity TEXT
      );

      -- News Items
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        url TEXT,
        image_url TEXT,
        source TEXT, -- 'steam', 'ign', etc.
        published_at DATETIME,
        related_game_id TEXT
      );

      -- Inventory System
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        external_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        type TEXT,
        rarity TEXT,
        appid INTEGER,
        contextid INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Sync History
      CREATE TABLE IF NOT EXISTS sync_history (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        sync_type TEXT NOT NULL, -- 'friends', 'games', 'inventory', 'full'
        status TEXT NOT NULL, -- 'success', 'failed', 'in_progress'
        items_synced INTEGER DEFAULT 0,
        error_message TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS profile_audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        field TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- 'bug', 'feature', 'general'
        content TEXT NOT NULL,
        rating INTEGER, -- 1-5
        contact_email TEXT,
        status TEXT DEFAULT 'open', -- 'open', 'closed', 'in_progress'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    try {
      this.db.prepare("ALTER TABLE games ADD COLUMN user_rating REAL DEFAULT 0").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE feedback ADD COLUMN sync_status TEXT DEFAULT 'pending'").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE feedback ADD COLUMN retry_count INTEGER DEFAULT 0").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE users ADD COLUMN username_updated_at DATETIME").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE users ADD COLUMN profile_last_updated_at DATETIME").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE games ADD COLUMN summary TEXT").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN genres TEXT").run(); // JSON array
      this.db.prepare("ALTER TABLE games ADD COLUMN release_date TEXT").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN rating REAL").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN hltb_main REAL").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN hltb_extra REAL").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN hltb_completionist REAL").run();
    } catch (error) {
    }
    try {
      this.db.prepare("ALTER TABLE games ADD COLUMN playtime_seconds INTEGER DEFAULT 0").run();
      this.db.prepare("ALTER TABLE games ADD COLUMN last_played DATETIME").run();
    } catch (error) {
    }
  }

  public getDb() {
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }
}

export const dbManager = new DatabaseManager()
