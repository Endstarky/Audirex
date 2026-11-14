# Audirex

**Audirex** is a fast, local-first Android music player built with **React Native**, **TypeScript**, and native **Kotlin/C++** modules. Designed around a custom deep-navy dark theme, it combines 120Hz virtualized library browsing, persistent per-collection sorting, offline-cached lyrics, and gesture-driven playback controls.

---

## Features

- **Local Music Scanner & Custom Folders:** Automatically indexes device audio via Android `MediaStore` alongside custom directories added through the Android Storage Access Framework (SAF).
- **120Hz Virtualized Library:** Every view—**All Songs**, **Albums**, **Artists**, **Genres**, **Folders**, **Playlists**, and **Queue**—is built with memoized `FlatList` virtualization and fixed item layouts for stutter-free scrolling across large libraries.
- **Persistent Per-View Sorting:** Each library tab and collection detail screen remembers its own sort criteria (Title, Artist, Album, Date Added, Track Count, and Reverse Order) across tab switches and app restarts via `AsyncStorage`, automatically syncing the playback queue to your active sorted order.
- **Lyrics with Offline Caching:** Fetches synced and plain lyrics from the [LRCLIB API](https://lrclib.net) and caches them locally in `AsyncStorage` for instant offline access.
- **Playlists & M3U Support:** Real-time **Liked Songs** synchronization from the Now Playing screen, custom playlist creation, and `.m3u` playlist import/export to device storage.
- **Curated Daily Mixes & Audio Tools:** Generates personalized Morning and Evening mixes based on local listening history, paired with a built-in Equalizer and live Queue manager.
- **Gesture Navigation:** Drag down on the Now Playing screen to return to your previous view, scrub tracks smoothly with touch gestures, or swipe from the left edge to open the navigation drawer.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & UI** | React Native, TypeScript, Custom Dark Navy Design System (`#050719` / `#090F22` / `#3E80FF`) |
| **Audio Engine** | `@rntp/player` (React Native Track Player) |
| **Native Android** | Kotlin Native Modules, Android `MediaStore`, Storage Access Framework (SAF), CMake / C++20 |
| **Storage & Filesystem** | `@react-native-async-storage/async-storage`, `@dr.pogodin/react-native-fs` |
| **Lyrics Provider** | LRCLIB Public API |

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- JDK 17 & Android SDK (Compile SDK 36 / NDK configured)
- Android Emulator or a physical Android device with USB Debugging enabled

### 1. Install Dependencies

```bash
npm install
