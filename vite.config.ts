import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    port: 7377,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Tauri expects a fixed port, fail if that port is not available
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
