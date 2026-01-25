# PlayHub

![PlayHub Logo](src/renderer/src/assets/top-right-logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/M0jam/m0jam.github.io/build.yml)](https://github.com/M0jam/m0jam.github.io/actions)
[![Version](https://img.shields.io/github/v/release/M0jam/m0jam.github.io)](https://github.com/M0jam/m0jam.github.io/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/M0jam/m0jam.github.io/releases)

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

| Platform | Download | Checksum (SHA-256) |
| :--- | :--- | :--- |
| **Windows** (Installer) | [PlayHub-Setup-1.0.4.exe](https://github.com/M0jam/m0jam.github.io/releases/latest) | `4B62B22816D093956097D25EC1C2D30C5CB06EFE8E7DA831033EDFFEB114709F` |
| **Windows** (Portable) | [PlayHub-1.0.4.exe](https://github.com/M0jam/m0jam.github.io/releases/latest) | `...` |
| **macOS** | [PlayHub-1.0.4.dmg](https://github.com/M0jam/m0jam.github.io/releases/latest) | `...` |
| **Linux** | [PlayHub-1.0.4.AppImage](https://github.com/M0jam/m0jam.github.io/releases/latest) | `...` |

> *Note: Visit the [Releases Page](https://github.com/M0jam/m0jam.github.io/releases) for all versions and release notes.*

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
    cd m0jam.github.io
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

## 🗺️ Roadmap

### 🎮 Short-Term
*   [ ] Refine game library grid layouts.
*   [ ] Improve Steam sync reliability (uninstall detection).
*   [ ] Polish profile & settings (avatars, themes).

### 🧩 Mid-Term
*   [ ] Smarter home screen suggestions.
*   [ ] Enhanced tagging (Backlog/Completed).
*   [ ] Richer game details (metadata, history).

### 🚀 Long-Term
*   [ ] Integration with more launchers (Epic, GOG).
*   [ ] Advanced playtime stats.
*   [ ] AI-powered conservative recommendations.

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
