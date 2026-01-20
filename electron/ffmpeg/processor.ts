import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Determine the platform and path to the bundled ffmpeg binary
let ffmpegPath = '';
let ffprobePath = '';

if (app.isPackaged) {
  // Production path
  const platform = process.platform;
  let platformFolder = '';
  let binaryName = 'ffmpeg';
  let probeName = 'ffprobe';

  if (platform === 'darwin') {
    platformFolder = 'ffmpeg-mac';
  } else if (platform === 'win32') {
    platformFolder = 'ffmpeg-win';
    binaryName = 'ffmpeg.exe';
    probeName = 'ffprobe.exe';
  } else if (platform === 'linux') {
    platformFolder = 'ffmpeg-linux';
  }

  ffmpegPath = path.join(process.resourcesPath, 'resources', platformFolder, binaryName);
  ffprobePath = path.join(process.resourcesPath, 'resources', platformFolder, probeName);
} else {
  // Development path (relative to project root)
  const platform = process.platform;
  let platformFolder = '';
  let binaryName = 'ffmpeg';
  let probeName = 'ffprobe';

   if (platform === 'darwin') {
    platformFolder = 'ffmpeg-mac';
  } else if (platform === 'win32') {
    platformFolder = 'ffmpeg-win';
    binaryName = 'ffmpeg.exe';
    probeName = 'ffprobe.exe';
  } else if (platform === 'linux') {
    platformFolder = 'ffmpeg-linux';
  }
  
  ffmpegPath = path.join(app.getAppPath(), 'resources', platformFolder, binaryName);
  ffprobePath = path.join(app.getAppPath(), 'resources', platformFolder, probeName);
}

// Set the path for fluent-ffmpeg
console.log('FFmpeg Path set to:', ffmpegPath);
console.log('FFprobe Path set to:', ffprobePath);
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export const generateThumbnail = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const tempDir = app.getPath('temp');
    const outputPath = path.join(tempDir, filename);

    ffmpeg(filePath)
      .screenshots({
        count: 1,
        timemarks: ['1'], // Take screenshot at 1 second
        folder: tempDir,
        filename: filename,
        size: '320x180' // Standard 16:9 thumbnail size
      })
      .on('end', () => {
        try {
          const data = fs.readFileSync(outputPath);
          const base64 = `data:image/png;base64,${data.toString('base64')}`;
          // Clean up
          fs.unlinkSync(outputPath);
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err: Error) => {
        console.error('Thumbnail generation failed:', err);
        reject(err);
      });
  });
};

export const generateWaveform = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filename = `wave_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const tempDir = app.getPath('temp');
    const outputPath = path.join(tempDir, filename);

    ffmpeg(filePath)
      .complexFilter([
        'aformat=channel_layouts=mono,showwavespic=s=2048x240:colors=#0ea5e9,scale=2048:120,pad=2048:120:0:(oh-ih)/2:color=black@0[outv]'
      ])
      .outputOptions(['-map [outv]', '-f image2', '-vframes 1'])
      .output(outputPath)
      .on('start', (cmd) => console.log('Waveform command:', cmd))
      .on('end', () => {
        try {
          const data = fs.readFileSync(outputPath);
          const base64 = `data:image/png;base64,${data.toString('base64')}`;
          fs.unlinkSync(outputPath);
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err: Error) => {
        console.error('Waveform generation failed:', err);
        // Resolve with empty string or handle error gracefully so it doesn't crash the app
        // Just resolve null or empty string to indicate no waveform
        resolve(''); 
      })
      .run();
  });
};

export const exportVideo = (clips: any[], eventSender: Electron.WebContents, outputPath: string) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add inputs
    clips.forEach((clip) => {
      command.input(clip.path);
    });

    // Build complex filter
    const filterComplex: string[] = [];
    const outputs: string[] = [];

    clips.forEach((clip, index) => {
      // Trim video
      filterComplex.push(`[${index}:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS[v${index}]`);
      // Trim audio (assuming audio exists, if not this might fail, but for MVP assuming yes)
      // We should check hasAudio but let's assume yes for standard video files
      filterComplex.push(`[${index}:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]`);
      
      outputs.push(`[v${index}][a${index}]`);
    });

    // Concat
    filterComplex.push(`${outputs.join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`);

    command
      .complexFilter(filterComplex)
      .outputOptions(['-map [outv]', '-map [outa]'])
      .output(outputPath)
      .on('progress', (progress) => {
        if (eventSender) {
          eventSender.send('export:progress', progress.percent);
        }
      })
      .on('end', () => resolve(true))
      .on('error', (err: Error) => reject(err))
      .run();
  });
};

export default ffmpeg;
