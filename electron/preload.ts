import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getMetadata: (filePath: string) => ipcRenderer.invoke('media:getMetadata', filePath),
  getThumbnail: (filePath: string) => ipcRenderer.invoke('media:getThumbnail', filePath),
  getWaveform: (filePath: string) => ipcRenderer.invoke('media:getWaveform', filePath),
  saveFile: () => ipcRenderer.invoke('dialog:saveFile'),
  exportVideo: (clips: any[], outputPath: string) => ipcRenderer.invoke('media:exportVideo', { clips, outputPath }),
  onExportProgress: (callback: (percent: number) => void) => {
    ipcRenderer.on('export:progress', (_, percent) => callback(percent));
  },
});
