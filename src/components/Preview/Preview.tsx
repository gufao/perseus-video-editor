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
    isPreviewMode,
    globalCurrentTime,
    setGlobalCurrentTime,
    totalDuration,
    getClipAtGlobalTime,
    getClipPosition
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

  const getCurrentPreviewClip = useCallback(() => {
    if (!isPreviewMode || clips.length === 0) return null;
    return getClipAtGlobalTime(globalCurrentTime);
  }, [isPreviewMode, globalCurrentTime, getClipAtGlobalTime]);

  const playVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Play failed, will retry:', err);
        pendingPlay.current = true;
      });
    }
  }, []);

  const switchToClip = useCallback((index: number, seekToStart: boolean = true) => {
    if (index < 0 || index >= clips.length) return;
    
    const clip = clips[index];
    const position = getClipPosition(index);
    
    if (!position || !videoRef.current) return;
    
    console.log('Switching to clip:', index, clip.name);
    
    isClipSwitching.current = true;
    setCurrentPreviewClipIndex(index);
    
    const needReload = clip.path !== lastPathRef.current;
    
    if (needReload) {
      console.log('Loading new video source:', clip.path);
      videoRef.current.src = convertFileSrc(clip.path);
      videoRef.current.load();
      lastPathRef.current = clip.path;
    }
    
    const targetTime = clip.start + (seekToStart ? 0 : (globalCurrentTime - position.start));
    
    console.log('Seeking to:', targetTime, 'clip.start:', clip.start);
    
    if (seekToStart) {
      setGlobalCurrentTime(position.start);
      lastVideoTimeUpdate.current = position.start;
    }
    
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
  }, [clips, getClipPosition, setGlobalCurrentTime, isPlaying, globalCurrentTime, playVideo]);

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
    if (!isPreviewMode || !videoRef.current) return;
    
    const clipInfo = getCurrentPreviewClip();
    if (!clipInfo) return;
    
    if (Math.abs(globalCurrentTime - lastVideoTimeUpdate.current) < 0.1) {
      return;
    }

    const { clip, index, localTime } = clipInfo;
    
    if (clip.path !== lastPathRef.current) {
      console.log('Global time changed, switching to clip:', index);
      switchToClip(index, false);
    } else {
      const targetTime = clip.start + localTime;
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.2) {
        console.log('Seeking to:', targetTime);
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [globalCurrentTime, isPreviewMode, getCurrentPreviewClip, switchToClip]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || isSeeking.current) return;
    
    if (isClipSwitching.current) return;

    if (!isPreviewMode) {
      if (!activeClip) return;
      
      const videoTime = videoRef.current.currentTime;
      
      if (videoTime < activeClip.start) {
         videoRef.current.currentTime = activeClip.start;
         return;
      }

      if (videoTime >= activeClip.end) {
        setIsPlaying(false);
        videoRef.current.currentTime = activeClip.start;
        setCurrentTime(0);
        lastVideoTimeUpdate.current = 0;
        return;
      }

      const relativeTime = videoTime - activeClip.start;
      
      if (Math.abs(currentTime - relativeTime) > 0.05) {
        lastVideoTimeUpdate.current = relativeTime;
        setCurrentTime(relativeTime);
      }
    } else {
      const clipInfo = getCurrentPreviewClip();
      if (!clipInfo) {
        console.log('No clip info at global time:', globalCurrentTime);
        return;
      }

      const { clip, index } = clipInfo;
      const videoTime = videoRef.current.currentTime;
      
      if (videoTime < clip.start) {
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
          switchToClip(nextIndex, true);
        } else {
          console.log('All clips ended, looping back to start');
          setIsPlaying(false);
          setGlobalCurrentTime(0);
          lastVideoTimeUpdate.current = 0;
          switchToClip(0, true);
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
        }
      }
    }
  };

  const togglePlay = () => {
    if (isPreviewMode) {
      if (clips.length === 0) return;
      
      if (!isPlaying) {
        const clipInfo = getCurrentPreviewClip();
        if (clipInfo && videoRef.current) {
          if (clipInfo.clip.path !== lastPathRef.current) {
            switchToClip(clipInfo.index, false);
          }
        }
      }
    } else {
      if (!activeClip) return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    
    if (!isPreviewMode) {
      setCurrentTime(newTime);
      if (videoRef.current && activeClip) {
        videoRef.current.currentTime = activeClip.start + newTime;
        lastVideoTimeUpdate.current = newTime;
      }
    } else {
      setGlobalCurrentTime(newTime);
      lastVideoTimeUpdate.current = newTime;
    }
  };

  const handleSeekStart = () => {
    isSeeking.current = true;
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    if (!isPreviewMode && videoRef.current && activeClip) {
      const targetTime = activeClip.start + currentTime;
      videoRef.current.currentTime = targetTime;
      lastVideoTimeUpdate.current = currentTime;
    } else if (isPreviewMode) {
      const clipInfo = getCurrentPreviewClip();
      if (clipInfo && videoRef.current) {
        videoRef.current.currentTime = clipInfo.clip.start + clipInfo.localTime;
        lastVideoTimeUpdate.current = globalCurrentTime;
      }
    }
  };

  useEffect(() => {
    if (!isPreviewMode) {
      if (videoRef.current && activeClip) {
        if (activeClip.path !== lastPathRef.current) {
          videoRef.current.src = convertFileSrc(activeClip.path);
          videoRef.current.load();
          lastPathRef.current = activeClip.path;
        }
        
        setIsPlaying(false);
        lastVideoTimeUpdate.current = 0;
        
        requestAnimationFrame(() => {
          if(videoRef.current) {
            videoRef.current.currentTime = activeClip.start;
          }
        });
        
        setCurrentTime(0);
      }
    } else {
      if (clips.length > 0) {
        const clipInfo = getCurrentPreviewClip();
        if (clipInfo) {
          switchToClip(clipInfo.index, false);
        } else {
          switchToClip(0, true);
        }
      }
    }
  }, [activeClip?.id, isPreviewMode, clips.length]);

  const getCurrentDisplayClip = () => {
    if (isPreviewMode) {
      const clipInfo = getCurrentPreviewClip();
      return clipInfo?.clip || null;
    }
    return activeClip;
  };

  const getCurrentDisplayTime = () => {
    if (isPreviewMode) return globalCurrentTime;
    return currentTime;
  };

  const getCurrentDuration = () => {
    if (isPreviewMode) return totalDuration;
    return activeClip?.duration || 0;
  };

  const displayClip = getCurrentDisplayClip();
  const displayTime = getCurrentDisplayTime();
  const displayDuration = getCurrentDuration();

  if (!displayClip) {
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
            if (!isPreviewMode) {
              setIsPlaying(false);
            }
          }}
          onClick={togglePlay}
          onError={(e) => console.error('Video Error:', e, displayClip.path)}
          preload="auto"
        />
        
        {isPreviewMode && clips.length > 1 && (
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
            {formatTime(displayTime)}
        </div>

        <input
          type="range"
          min="0"
          max={displayDuration || 100}
          step="0.01"
          value={displayTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          disabled={!displayClip}
          className="flex-1 h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-hover"
        />
        
        <div className="text-xs font-mono text-text-muted w-20 text-center">
            {formatTime(displayDuration)}
        </div>
      </div>
    </div>
  );
};

export default Preview;
