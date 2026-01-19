# Perseus - Video Editor

A simple, non-linear video editor built with Electron, React, and FFmpeg.

## Features
- Import and preview videos
- Timeline with drag-and-drop ordering
- Split and Trim clips
- Audio Waveform visualization
- Export to MP4

## Prerequisites

### FFmpeg Binaries
This project relies on FFmpeg binaries to process video and audio. These binaries are **not included** in the repository to keep the size manageable.

You must download the appropriate binaries for your platform and place them in the `resources` directory structure:

```
resources/
├── ffmpeg-linux/
│   ├── ffmpeg
│   └── ffprobe
├── ffmpeg-mac/
│   ├── ffmpeg
│   └── ffprobe
└── ffmpeg-win/
    ├── ffmpeg.exe
    └── ffprobe.exe
```

You can download static builds from [ffmpeg.org](https://ffmpeg.org/download.html).

**Note for macOS:** You may need to remove the quarantine attribute from the downloaded binaries:
```bash
xattr -dr com.apple.quarantine resources/ffmpeg-mac/
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Build

To build the application for your current platform:
```bash
npm run build
```