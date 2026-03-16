import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import type { PerseusAPI } from '../types/api';

export const api: PerseusAPI = {
  openFile: async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
    });
    if (!selected) return [];
    return Array.isArray(selected) ? selected : [selected];
  },

  getMetadata: (filePath: string) => {
    return invoke('get_metadata', { filePath });
  },

  getThumbnail: (filePath: string) => {
    return invoke('get_thumbnail', { filePath });
  },

  getWaveform: (filePath: string) => {
    return invoke('get_waveform', { filePath });
  },

  saveFile: async () => {
    const path = await save({
      filters: [{ name: 'Movies', extensions: ['mp4'] }],
    });
    return path ?? null;
  },

  exportVideo: (clips: any[], outputPath: string) => {
    return invoke('export_video', { clips, outputPath });
  },

  onExportProgress: (callback: (percent: number) => void) => {
    let unlisten: (() => void) | null = null;

    listen<number>('export:progress-percent', (event) => {
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    // Return cleanup function
    return () => {
      if (unlisten) unlisten();
    };
  },
};
