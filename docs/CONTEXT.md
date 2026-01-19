# PlayHub Context & Design Philosophy

## Core User Experience
*   **Time-Aware Welcome**: The app opens with "Good morning" or "Good evening" based on the system clock. This small touch signals that the app is alive and context-sensitive, building immediate user trust.
*   **Low Cognitive Load**:
    *   No nested labyrinth menus.
    *   Clear visual hierarchy.
    *   **Performance**: The app must feel fast. Perceived performance is as critical as real performance.

## UI Structure

### Left Sidebar (The Spine)
*   **Behavior**: Fixed position. Never changes to preserve muscle memory.
*   **Components**:
    *   **Connected Platforms**: (Steam, Epic, EA, GOG, etc.) with status indicators (connected, syncing, offline).
    *   **Library Button**: Aggregates all owned games across platforms into one unified view.

### Home Screen (Default View)
*   **Primary Goal**: Answer the question, *"What do I want to play right now?"*
*   **Content**:
    *   **Recently Played**: Appears first for quick access.
    *   **Recommendations**: Generated from play history, genres, time played, and tags (single-player, co-op, chill, competitive).
    *   **AI Philosophy**: Recommendations should be conservative at first. Over-eager AI feels untrustworthy.

### Top Navigation Areas

#### News Tab (Upper-Left)
*   **Positioning**: Secondary but relevant.
*   **Content**:
    *   Game updates for owned titles (patches, DLC, events).
    *   Announcements/releases related to owned games and frequently played genres.
    *   **Rule**: Relevance beats volume. No generic hype spam.

#### Global Search (Top Center)
*   **Scope**: Searches Owned games, Installed games, Store pages (optional), and Friends (optional later).
*   **UX**: Must be instant and forgiving of typos.

#### Social Tab (Next to Search)
*   **Features**:
    *   Unified friends list from connected platforms.
    *   Presence indicators (online, in-game, status).
    *   **Behavior**: Content dynamically adapts based on connected accounts.

## Engineering & Design Truths

1.  **Sync Reliability is Critical**: An all-in-one launcher lives or dies on this. Users will forgive missing features; they will not forgive missing games.
2.  **Data Unifier Architecture**: You are building a data unifier, not just a UI.
    *   Each platform connector must be **modular and sandboxed**.
    *   Quirks, rate limits, or failures in one platform (e.g., Epic) must not impact others (e.g., Steam).
3.  **Offline Behavior**: Design carefully for offline states. A launcher that functions when APIs are down feels magical.

## Technical Architecture

### Database Schema (SQLite)

The application uses a local SQLite database to ensure offline capability and fast access.

```sql
-- Core user accounts for external platforms
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL, -- 'steam', 'epic', 'gog'
    username TEXT,
    auth_data TEXT, -- Encrypted tokens
    status TEXT DEFAULT 'offline',
    last_synced DATETIME
);

-- The unified game library
CREATE TABLE games (
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

-- Analytics for recommendations
CREATE TABLE play_sessions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER,
    FOREIGN KEY(game_id) REFERENCES games(id)
);

-- Tags for categorization and AI filtering
CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL -- 'FPS', 'Co-op', 'Indie'
);

CREATE TABLE game_tags (
    game_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (game_id, tag_id)
);
```

### Optimal Folder Structure

This structure enforces the "modular and sandboxed" philosophy.

```
/
├── .github/                 # CI/CD workflows
├── docs/                    # Architecture & Design docs
├── resources/               # Static assets (icons, images) not bundled
├── src/
│   ├── main/                # Backend / Main Process (Node.js/Electron/Rust)
│   │   ├── connectors/      # SANDBOXED Platform Modules
│   │   │   ├── base-connector.ts  # Interface definition
│   │   │   ├── steam/       # Steam implementation
│   │   │   ├── epic/        # Epic implementation
│   │   │   └── gog/         # GOG implementation
│   │   ├── database/        # SQLite setup & migrations
│   │   ├── services/        # Core business logic
│   │   │   ├── library-manager.ts # Aggregation logic
│   │   │   ├── game-launcher.ts   # Process management
│   │   │   └── sync-engine.ts     # Orchestrates platform syncs
│   │   └── index.ts         # Entry point
│   │
│   ├── renderer/            # Frontend / UI (React/Vue/Svelte)
│   │   ├── components/      # Reusable UI atoms
│   │   │   ├── sidebar/     # The "Spine"
│   │   │   ├── game-card/
│   │   │   └── search-bar/
│   │   ├── layouts/         # App shell layouts
│   │   ├── pages/           # Route views (Home, Library, Settings)
│   │   ├── store/           # State management (Zustand/Redux)
│   │   ├── styles/          # Global theme/CSS
│   │   └── App.tsx
│   │
│   └── shared/              # Shared types, constants, utilities
│       ├── types.ts         # Game, User, Platform interfaces
│       └── events.ts        # IPC channel names
├── package.json
└── README.md
```
