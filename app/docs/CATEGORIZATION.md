# Application Categorization & Classification

This document outlines the logic and criteria used to classify applications within PlayHub into **Games** and **Utilities**.

## Overview

PlayHub strictly separates entertainment software (Games) from system tools and enhancements (Utilities) to provide a cleaner, more organized user experience. This separation is enforced at both the database level and the application layer.

## Database Schema

The `games` table includes an `app_type` column:
- `game`: Standard video games.
- `utility`: Software tools, wallpapers, system optimizers, etc.

## Classification Logic

When importing or syncing applications (e.g., from Steam), the system automatically assigns an `app_type` based on metadata.

### 1. Steam Metadata
If the application comes from Steam, we check the `type` and `genres` fields provided by the Steam Store API.

**Classified as `utility` if:**
- The `type` field is explicitly NOT `game` (e.g., `software`, `tool`).
- OR the `genres` list contains any of the following keywords (case-insensitive):
  - `utility`
  - `utilities`
  - `software`
  - `tool`

**Classified as `game` if:**
- It does not match the utility criteria.

### 2. Manual Overrides (Future)
*Currently, classification is automatic. Future updates may allow users to manually toggle an application's type via the "Edit Game" modal.*

## Frontend Implementation

### Data Fetching
The `library:get` IPC handler accepts a filter argument to enforce separation:
- `library:get('utilities')`: Returns `WHERE app_type = 'utility'`.
- `library:get('all')` (default): Returns `WHERE app_type = 'game'`.
- `library:get('installed')`: Returns `WHERE is_installed = 1 AND app_type = 'game'`.

This ensures that the "Games" tab never accidentally displays utilities, and vice-versa.

### Utility Categories
Within the **Utilities** tab, applications are further sub-categorized on the frontend for better organization:

| Category | Keywords (Title/Genre) | Examples |
|----------|------------------------|----------|
| **Wallpaper** | `wallpaper`, `background`, `lively` | Wallpaper Engine, Lively Wallpaper |
| **System** | `system`, `cpu`, `gpu`, `monitor`, `cleaner` | CPU-Z, CCleaner, MSI Afterburner |
| **Customization** | `customiz`, `theme`, `skin`, `rainmeter`, `translucent` | Rainmeter, TranslucentTB |
| **Other** | *Matches none of the above* | Soundpad, OVR Toolkit |

## Maintenance

### Adding New Classification Rules
To modify the backend classification logic, update `isUtility` in `app/src/main/services/game-service.ts`.

### Updating Frontend Categories
To modify the sub-categories in the Utility tab, update the `categorize` function within the `filteredUtilities` useMemo hook in `app/src/renderer/src/App.tsx`.
