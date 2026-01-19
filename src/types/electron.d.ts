export interface ElectronAPI {
  ping: () => Promise<string>;
  openFile: () => Promise<string[]>;
  getMetadata: (filePath: string) => Promise<{ duration: number; format: string; width: number; height: number }>;
  getThumbnail: (filePath: string) => Promise<string | null>;
  getWaveform: (filePath: string) => Promise<string | null>;
  saveFile: () => Promise<string | null>;
  exportVideo: (clips: any[], outputPath: string) => Promise<boolean>;
  onExportProgress: (callback: (percent: number) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
