import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg, { exportVideo, generateThumbnail, generateWaveform } from './ffmpeg/processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the application name for the menu bar
app.setName('Perseus');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Perseus',
    icon: path.join(__dirname, app.isPackaged ? '../dist/logo.png' : '../public/logo.png'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allow loading local files
      sandbox: false
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, app.isPackaged ? '../dist/logo.png' : '../public/logo.png');
    app.dock.setIcon(iconPath);
  }

  // mainWindow.webContents.openDevTools();
}

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }],
  });
  if (canceled) {
    return [];
  } else {
    return filePaths;
  }
});

ipcMain.handle('media:getMetadata', async (_, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        console.error('ffprobe error:', err);
        reject(err);
      } else {
        console.log('ffprobe success:', metadata.format.duration);
        resolve({
          duration: metadata.format.duration,
          format: metadata.format.format_name,
          width: metadata.streams[0].width,
          height: metadata.streams[0].height,
        });
      }
    });
  });
});

ipcMain.handle('media:getThumbnail', async (_, filePath) => {
  try {
    const base64 = await generateThumbnail(filePath);
    return base64;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
});

ipcMain.handle('media:getWaveform', async (_, filePath) => {
  try {
    const base64 = await generateWaveform(filePath);
    return base64;
  } catch (error) {
    console.error('Failed to generate waveform:', error);
    return null;
  }
});

ipcMain.handle('dialog:saveFile', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'Movies', extensions: ['mp4'] }],
  });
  if (canceled) {
    return null;
  } else {
    return filePath;
  }
});

ipcMain.handle('media:exportVideo', async (event, { clips, outputPath }) => {
  try {
    await exportVideo(clips, event.sender, outputPath);
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});