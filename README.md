# PlayHub

![PlayHub Logo](assets/playhub_logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/M0jam/m0jam.github.io)](https://github.com/M0jam/m0jam.github.io/releases)

**PlayHub** is a unified game launcher designed to bring all your games into one beautiful, organized library. Whether you play on Steam, Epic, or have standalone titles, PlayHub helps you decide *what to play* instantly.

---

## 🌟 Key Features

*   **🎮 Unified Library**: Automatically syncs with Steam and supports manual additions for other games.
*   **⚡ Modern UI**: Fast, responsive interface built with React and Tailwind CSS.
*   **🔍 "What to Play"**: Smart filtering and "Backlog" status management to help you tackle your library.
*   **📰 Gaming News**: Integrated news feed to keep you updated on the latest gaming trends.
*   **👥 Social Hub**: Connect with friends, chat, and see what they're playing (Discord integration planned).
*   **🌍 Multi-language**: Full support for English and German (Deutsch).

---

## 📥 Download

⚠️ **Currently available for Windows only.** (macOS and Linux support coming soon!)

| Platform | Download | Checksum (SHA-256) |
| :--- | :--- | :--- |
| **Windows** (Installer) | [PlayHub-Setup-1.0.4.exe](https://github.com/M0jam/m0jam.github.io/releases/download/v1.0.4/PlayHub-Setup-1.0.4.exe) | `4B62B22816D093956097D25EC1C2D30C5CB06EFE8E7DA831033EDFFEB114709F` |
| **Windows** (Portable) | [PlayHub_Portable_1.0.4.exe](https://github.com/M0jam/m0jam.github.io/releases/download/v1.0.4/PlayHub_Portable_1.0.4.exe) | `B38A9C0F227BD5B873319A9F7538A5002AAD7868B8D096906455995CC1DF0FC2` |

> *Note: If the links above do not work, please visit the [Releases Page](https://github.com/M0jam/m0jam.github.io/releases) directly.*

---

## 🚀 Installation & Development

### Prerequisites
*   **Node.js** (v18 or higher)
*   **npm** (v9 or higher)
*   **Git**

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/M0jam/m0jam.github.io.git
    cd m0jam.github.io/app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # If you encounter native module errors (e.g., better-sqlite3):
    npx electron-builder install-app-deps
    ```

3.  **Run in development mode**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    # To package the application:
    npm run dist
    ```

---

## 🛠️ Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/), [clsx](https://github.com/lukeed/clsx)
*   **Data**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (Local Database)
*   **Build**: [Electron-Vite](https://electron-vite.org/), [Electron Builder](https://www.electron.build/)

---

<!-- Updated Roadmap -->
## 🗺️ Roadmap

### ✅ Completed
*   [x] **Multi-Launcher Integration**: Full support for Steam, Epic Games, and GOG Galaxy.
*   [x] **Rich Game Metadata**: Integrated HowLongToBeat (HLTB) and IGDB for playtime stats and descriptions.
*   [x] **UI/UX Polish**: Dynamic Theme System, Skins, and responsive Grid Layouts.
*   [x] **Sync Reliability**: Improved uninstall detection and library synchronization for Steam.
*   [x] **Account Security**: Device disconnect flow, Email verification, and "Forgot Password" functionality.
*   [x] **Startup Experience**: Custom Splash Screen and optimized boot time.
*   [x] **User Identity**: Unique username system and avatar management.

### 🚧 In Progress
| Task | Description | Status | Team |
| :--- | :--- | :--- | :--- |
| **macOS & Linux Support** | Porting the codebase and native modules to support cross-platform builds. | 🔄 Testing | Core Devs |
| **Discord Integration** | Implementing Rich Presence to show current game status on Discord. | 🛠️ Development | Backend |
| **Advanced Tagging** | Custom tags (e.g., "Backlog", "Completed") for better library organization. | 🎨 Design | Frontend |
| **AI Recommendations** | Developing a local algorithm to suggest games based on play history and time of day. | 🧠 Research | Data Science |

### 🚀 Planned / Backlog
*   [ ] **Cloud Saves**: Sync game saves across devices.
*   [ ] **Social Hub**: Chat and activity feed with friends.
*   [ ] **Mobile Companion App**: Manage library from your phone.

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📞 Contact

Project Link: [https://m0jam.github.io/](https://m0jam.github.io/)
