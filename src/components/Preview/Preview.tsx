import { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import { useLanguage } from '../LanguageProvider';
import { convertFileSrc } from '@tauri-apps/api/core';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

const Preview = () => {
  const { 
    activeClipId, 
    clips, 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    setCurrentTime,
    globalCurrentTime,
    setGlobalCurrentTime,
    totalDuration,
    getClipAtGlobalTime,
    getClipPosition,
    setActiveClip
  } = useProjectStore();
  
  const activeClip = clips.find((c) => c.id === activeClipId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSeeking = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const { t } = useLanguage();
  
  const lastVideoTimeUpdate = useRef<number>(0);
  const isClipSwitching = useRef(false);
  const pendingPlay = useRef(false);
  const [currentPreviewClipIndex, setCurrentPreviewClipIndex] = useState<number>(0);
  const [hasVideo, setHasVideo] = useState(false);

  const getCurrentClip = useCallback(() => {
    if (clips.length === 0) return null;
    
    const clipInfo = getClipAtGlobalTime(globalCurrentTime);
    if (clipInfo) {
      return clipInfo;
    }
    
    if (activeClip) {
      const index = clips.findIndex(c => c.id === activeClipId);
      if (index >= 0) {
        const position = getClipPosition(index);
        if (position) {
          return {
            clip: activeClip,
            index,
            localTime: currentTime
          };
        }
      }
    }
    
    return null;
  }, [clips, globalCurrentTime, activeClip, activeClipId, currentTime, getClipAtGlobalTime, getClipPosition]);

  const playVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Play failed, will retry:', err);
        pendingPlay.current = true;
      });
    }
  }, []);

  const switchToClip = useCallback((index: number, localTime: number = 0) => {
    if (index < 0 || index >= clips.length) return;
    
    const clip = clips[index];
    const position = getClipPosition(index);
    
    if (!position || !videoRef.current) return;
    
    console.log('Switching to clip:', index, clip.name, 'localTime:', localTime);
    
    isClipSwitching.current = true;
    setCurrentPreviewClipIndex(index);
    
    const needReload = clip.path !== lastPathRef.current;
    const targetTime = clip.start + localTime;
    
    setActiveClip(clip.id);
    
    if (needReload) {
      console.log('Loading new video source:', clip.path);
      videoRef.current.src = convertFileSrc(clip.path);
      videoRef.current.load();
      lastPathRef.current = clip.path;
    }
    
    const globalTime = position.start + localTime;
    setGlobalCurrentTime(globalTime);
    setCurrentTime(localTime);
    lastVideoTimeUpdate.current = globalTime;
    
    if (needReload) {
      pendingPlay.current = isPlaying;
      const handler = () => {
        if (videoRef.current) {
          console.log('Video loaded, seeking to:', targetTime);
          videoRef.current.currentTime = targetTime;
          if (pendingPlay.current) {
            playVideo();
            pendingPlay.current = false;
          }
          videoRef.current.removeEventListener('loadedmetadata', handler);
        }
      };
      videoRef.current.addEventListener('loadedmetadata', handler);
    } else {
      videoRef.current.currentTime = targetTime;
      if (isPlaying) {
        playVideo();
      }
    }
    
    setTimeout(() => {
      isClipSwitching.current = false;
    }, 200);
  }, [clips, getClipPosition, setActiveClip, setGlobalCurrentTime, setCurrentTime, isPlaying, playVideo]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        playVideo();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, playVideo]);

  useEffect(() => {
    if (!videoRef.current || clips.length === 0) return;
    
    const clipInfo = getCurrentClip();
    if (!clipInfo) return;
    
    if (Math.abs(globalCurrentTime - lastVideoTimeUpdate.current) < 0.1) {
      return;
    }

    const { clip, index, localTime } = clipInfo;
    
    if (clip.path !== lastPathRef.current) {
      console.log('Global time changed, switching to clip:', index);
      switchToClip(index, localTime);
    } else {
      const targetTime = clip.start + localTime;
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.2) {
        console.log('Seeking to:', targetTime);
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [globalCurrentTime, getCurrentClip, switchToClip, clips.length]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || isSeeking.current || clips.length === 0) return;
    
    if (isClipSwitching.current) return;

    const clipInfo = getCurrentClip();
    if (!clipInfo) {
      console.log('No clip info at global time:', globalCurrentTime);
      return;
    }

    const { clip, index } = clipInfo;
    const videoTime = videoRef.current.currentTime;
    
    if (videoTime < clip.start - 0.01) {
      console.log('Video time before clip start, seeking:', videoTime, clip.start);
      videoRef.current.currentTime = clip.start;
      return;
    }

    if (videoTime >= clip.end - 0.05) {
      console.log('Clip ended, videoTime:', videoTime, 'clip.end:', clip.end);
      const nextIndex = index + 1;
      
      if (nextIndex < clips.length) {
        console.log('Switching to next clip:', nextIndex);
        pendingPlay.current = true;
        switchToClip(nextIndex, 0);
      } else {
        console.log('All clips ended, pausing');
        setIsPlaying(false);
        setGlobalCurrentTime(0);
        lastVideoTimeUpdate.current = 0;
        switchToClip(0, 0);
      }
      return;
    }

    const position = getClipPosition(index);
    if (position) {
      const localTime = videoTime - clip.start;
      const newGlobalTime = position.start + localTime;
      
      if (Math.abs(globalCurrentTime - newGlobalTime) > 0.05) {
        lastVideoTimeUpdate.current = newGlobalTime;
        setGlobalCurrentTime(newGlobalTime);
        setCurrentTime(localTime);
      }
    }
  };

  const togglePlay = () => {
    if (clips.length === 0) return;
    
    const clipInfo = getCurrentClip();
    if (!isPlaying && clipInfo && videoRef.current) {
      if (clipInfo.clip.path !== lastPathRef.current) {
        switchToClip(clipInfo.index, clipInfo.localTime);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    
    setGlobalCurrentTime(newTime);
    setCurrentTime(newTime);
    lastVideoTimeUpdate.current = newTime;
    
    const clipInfo = getClipAtGlobalTime(newTime);
    if (clipInfo && videoRef.current) {
      const targetTime = clipInfo.clip.start + clipInfo.localTime;
      videoRef.current.currentTime = targetTime;
      setActiveClip(clipInfo.clip.id);
    }
  };

  const handleSeekStart = () => {
    isSeeking.current = true;
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    const clipInfo = getClipAtGlobalTime(globalCurrentTime);
    if (clipInfo && videoRef.current) {
      videoRef.current.currentTime = clipInfo.clip.start + clipInfo.localTime;
      lastVideoTimeUpdate.current = globalCurrentTime;
    }
  };

  useEffect(() => {
    if (clips.length === 0) {
      setHasVideo(false);
      return;
    }
    
    setHasVideo(true);
    
    const clipInfo = getCurrentClip();
    if (clipInfo) {
      if (clipInfo.clip.path !== lastPathRef.current) {
        switchToClip(clipInfo.index, clipInfo.localTime);
      }
    } else {
      switchToClip(0, 0);
    }
  }, [clips.length]);

  useEffect(() => {
    if (clips.length > 0 && activeClip && lastPathRef.current === null) {
      const index = clips.findIndex(c => c.id === activeClipId);
      if (index >= 0) {
        switchToClip(index, 0);
      }
    }
  }, [activeClipId, clips.length]);

  const displayClip = getCurrentClip()?.clip || activeClip;

  if (!displayClip || clips.length === 0) {
    return (
      <div className="w-full h-full flex flex-col bg-bg-primary relative">
        <div className="flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden">
          <div className="text-text-secondary flex flex-col items-center justify-center h-full">
            <div className="mb-2">{t('preview.noClipSelected')}</div>
            <div className="text-xs text-text-muted">{t('preview.selectClipHint')}</div>
          </div>
        </div>
        <div className="h-12 bg-bg-elevated border-t border-border-primary flex items-center px-4 space-x-4">
          <button 
            onClick={togglePlay}
            disabled={true}
            className="text-text-primary hover:text-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          </button>
          <div className="text-xs font-mono text-text-secondary w-20 text-center">0:00.0</div>
          <input
            type="range"
            min="0"
            max="100"
            value="0"
            disabled={true}
            className="flex-1 h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-hover"
          />
          <div className="text-xs font-mono text-text-muted w-20 text-center">0:00.0</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-bg-primary relative group">
      <div className="flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden">
        <video
          ref={videoRef}
          src={convertFileSrc(displayClip.path)}
          className="max-h-full max-w-full shadow-2xl"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            console.log('Video ended event');
          }}
          onClick={togglePlay}
          onError={(e) => console.error('Video Error:', e, displayClip.path)}
          preload="auto"
          muted={false}
        />
        
        {clips.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
            {t('preview.previewingProject')} {currentPreviewClipIndex + 1}/{clips.length}: {displayClip.name}
          </div>
        )}
      </div>

      <div className="h-12 bg-bg-elevated border-t border-border-primary flex items-center px-4 space-x-4">
        <button 
          onClick={togglePlay}
          disabled={!displayClip}
          className="text-text-primary hover:text-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPlaying ? (
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path></svg>
          ) : (
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          )}
        </button>

        <div className="text-xs font-mono text-text-secondary w-20 text-center">
            {formatTime(globalCurrentTime)}
        </div>

        <input
          type="range"
          min="0"
          max={totalDuration || 100}
          step="0.01"
          value={globalCurrentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          disabled={!displayClip}
          className="flex-1 h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-hover"
        />
        
        <div className="text-xs font-mono text-text-muted w-20 text-center">
            {formatTime(totalDuration)}
        </div>
      </div>
    </div>
  );
};

export default Preview;
