# Perseus Video Editor

**Perseus** is a lightweight, open-source desktop video editor built for speed and simplicity. Designed for quick cuts, trims, and exports without the bloat of professional NLEs.

![Perseus Screenshot](https://raw.githubusercontent.com/gufao/perseus-video-editor/main/public/logo.png)

## Features

- **Fast & Lightweight**: Starts instantly, runs smoothly on macOS, Windows, and Linux.
- **Precision Cutting**: Frame-perfect splitting and trimming.
- **Visual Timeline**: Drag-and-drop timeline with waveform visualization.
- **Multi-Format Support**: Powered by FFmpeg to handle MP4, MOV, MKV, AVI, and more.
- **Quick Export**: Optimized presets for fast rendering to MP4.
- **Private & Offline**: No cloud uploads, no accounts, no subscriptions. Your media stays on your machine.

## Download

Download the latest version for your platform from the [Releases Page](https://github.com/gufao/perseus-video-editor/releases/latest) or our [Website](https://perseus.linhares.sc).

- **macOS**: DMG (Apple Silicon & Intel)
- **Windows**: NSIS Installer
- **Linux**: AppImage / .deb

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- Node.js (v18+)
- NPM

### Setup

```bash
git clone https://github.com/gufao/perseus-video-editor.git
cd perseus-video-editor
npm install
```

### Running Locally

```bash
cargo tauri dev
```

### Building

To create a production build for your current platform:

```bash
cargo tauri build
```

## Tech Stack

- **Tauri**: Native desktop runtime (Rust)
- **React**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **FFmpeg**: Media processing core

## License

MIT © [Perseus Team](https://github.com/gufao)
