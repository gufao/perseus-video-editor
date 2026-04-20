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

interface ClipMetadata {
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  audioSampleRate: number;
  audioChannels: number;
}

const getClipMetadata = (filePath: string): Promise<ClipMetadata> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');

      let fps = 30;
      if (videoStream && videoStream.r_frame_rate) {
        const fpsMatch = videoStream.r_frame_rate.match(/(\d+)\/(\d+)/);
        if (fpsMatch) {
          fps = parseInt(fpsMatch[1]) / parseInt(fpsMatch[2]);
        }
      }

      resolve({
        width: videoStream?.width || 1920,
        height: videoStream?.height || 1080,
        fps: fps,
        hasAudio: !!audioStream,
        audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : 44100,
        audioChannels: audioStream?.channels || 2
      });
    });
  });
};

export const exportVideo = async (clips: any[], eventSender: Electron.WebContents, outputPath: string) => {
  if (clips.length === 0) {
    throw new Error('No clips to export');
  }

  const allMetadata: ClipMetadata[] = [];
  for (const clip of clips) {
    try {
      const meta = await getClipMetadata(clip.path);
      allMetadata.push(meta);
    } catch (err) {
      console.warn('Failed to get metadata for', clip.path, err);
      allMetadata.push({
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        audioSampleRate: 44100,
        audioChannels: 2
      });
    }
  }

  const targetWidth = Math.max(...allMetadata.map(m => m.width));
  const targetHeight = Math.max(...allMetadata.map(m => m.height));
  const targetFps = Math.min(...allMetadata.map(m => m.fps));
  const targetSampleRate = 48000;
  const targetChannels = 2;

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    clips.forEach((clip) => {
      command.input(clip.path);
    });

    const filterComplex: string[] = [];
    const outputs: string[] = [];

    clips.forEach((clip, index) => {
      const meta = allMetadata[index];
      const videoLabel = `v_trim_${index}`;
      const audioLabel = `a_trim_${index}`;
      
      filterComplex.push(`[${index}:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS[${videoLabel}]`);
      
      let currentVideoLabel = videoLabel;
      
      if (meta.width !== targetWidth || meta.height !== targetHeight) {
        const scaleLabel = `v_scale_${index}`;
        filterComplex.push(`[${currentVideoLabel}]scale=width=${targetWidth}:height=${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black[${scaleLabel}]`);
        currentVideoLabel = scaleLabel;
      }
      
      if (Math.abs(meta.fps - targetFps) > 0.1) {
        const fpsLabel = `v_fps_${index}`;
        filterComplex.push(`[${currentVideoLabel}]fps=fps=${targetFps}[${fpsLabel}]`);
        currentVideoLabel = fpsLabel;
      }
      
      const finalVideoLabel = `v_final_${index}`;
      filterComplex.push(`[${currentVideoLabel}]format=yuv420p[${finalVideoLabel}]`);

      if (meta.hasAudio) {
        filterComplex.push(`[${index}:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[${audioLabel}]`);
        
        let currentAudioLabel = audioLabel;
        
        if (meta.audioSampleRate !== targetSampleRate) {
          const arLabel = `a_ar_${index}`;
          filterComplex.push(`[${currentAudioLabel}]aformat=sample_fmts=fltp:sample_rates=${targetSampleRate}:channel_layouts=stereo[${arLabel}]`);
          currentAudioLabel = arLabel;
        } else if (meta.audioChannels !== targetChannels) {
          const acLabel = `a_ac_${index}`;
          filterComplex.push(`[${currentAudioLabel}]aformat=channel_layouts=stereo[${acLabel}]`);
          currentAudioLabel = acLabel;
        }
        
        const finalAudioLabel = `a_final_${index}`;
        filterComplex.push(`[${currentAudioLabel}]aresample=${targetSampleRate}[${finalAudioLabel}]`);
        
        outputs.push(`[${finalVideoLabel}][${finalAudioLabel}]`);
      } else {
        const silentLabel = `a_silent_${index}`;
        const duration = clip.end - clip.start;
        filterComplex.push(`anullsrc=r=${targetSampleRate}:cl=stereo:duration=${duration}[${silentLabel}]`);
        outputs.push(`[${finalVideoLabel}][${silentLabel}]`);
      }
    });

    filterComplex.push(`${outputs.join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`);

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [outv]',
        '-map [outa]',
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-movflags +faststart',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (eventSender) {
          eventSender.send('export:progress', progress.percent);
        }
      })
      .on('end', () => resolve(true))
      .on('error', (err: Error) => {
        console.error('Export error:', err);
        reject(err);
      })
      .run();
  });
};

export default ffmpeg;
