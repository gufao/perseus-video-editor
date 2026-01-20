import { useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

const Preview = () => {
  const { activeClipId, clips, isPlaying, setIsPlaying, currentTime, setCurrentTime } = useProjectStore();
  const activeClip = clips.find((c) => c.id === activeClipId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSeeking = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  
  // Track the last time we pushed TO the store to avoid feedback loops
  const lastVideoTimeUpdate = useRef<number>(0);

  // Sync Play/Pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Sync Seek (Store -> Video)
  useEffect(() => {
    if (videoRef.current && activeClip && !isSeeking.current) {
      // If the update came from the video (detected by matching last pushed time), ignore it
      if (Math.abs(currentTime - lastVideoTimeUpdate.current) < 0.1) {
        return;
      }

      const targetTime = activeClip.start + currentTime;
      // Only seek if we are actually out of sync
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.2) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [currentTime, activeClip]);

  const handleTimeUpdate = () => {
    if (videoRef.current && activeClip && !isSeeking.current) {
      const videoTime = videoRef.current.currentTime;
      
      // Enforce bounds
      if (videoTime < activeClip.start) {
         videoRef.current.currentTime = activeClip.start;
         return;
      }

      if (videoTime >= activeClip.end) {
        setIsPlaying(false);
        videoRef.current.currentTime = activeClip.start; // Loop back to start of clip
        setCurrentTime(0);
        lastVideoTimeUpdate.current = 0;
        return;
      }

      // Update store with relative time
      const relativeTime = videoTime - activeClip.start;
      
      // Only update if changed significantly to reduce React overhead
      if (Math.abs(currentTime - relativeTime) > 0.05) {
        lastVideoTimeUpdate.current = relativeTime;
        setCurrentTime(relativeTime);
      }
    }
  };

  // UI Handlers for Custom Controls
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && activeClip) {
       // Optional: Force a seek to start time if needed, though useEffect handles this
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    // Update video in real-time while dragging
    if (videoRef.current && activeClip) {
        videoRef.current.currentTime = activeClip.start + newTime;
        lastVideoTimeUpdate.current = newTime;
    }
  };

  const handleSeekStart = () => {
    isSeeking.current = true;
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    // Force sync video to new store time immediately
    if (videoRef.current && activeClip) {
        const targetTime = activeClip.start + currentTime;
        videoRef.current.currentTime = targetTime;
        lastVideoTimeUpdate.current = currentTime; // Prevent loop
    }
  };


  // Handle active clip changes
  useEffect(() => {
    if (videoRef.current && activeClip) {
      // Only reload if path changed
      if (activeClip.path !== lastPathRef.current) {
        videoRef.current.src = `file://${activeClip.path}`;
        videoRef.current.load();
        lastPathRef.current = activeClip.path;
      }
      
      // Always reset state for new clip
      setIsPlaying(false);
      lastVideoTimeUpdate.current = 0;
      
      // Set initial position
      requestAnimationFrame(() => {
        if(videoRef.current) {
            videoRef.current.currentTime = activeClip.start;
        }
      });
      
      setCurrentTime(0);
    }
  }, [activeClip?.id, activeClip?.path, activeClip?.start, setIsPlaying, setCurrentTime]);

  if (!activeClip) {
    return (
      <div className="text-text-secondary flex flex-col items-center justify-center h-full">
        <div className="mb-2">No clip selected</div>
        <div className="text-xs text-text-muted">Select a clip from the Project Files or Timeline</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-bg-primary relative group">
      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center bg-bg-primary relative overflow-hidden">
        <video
          ref={videoRef}
          src={`file://${activeClip.path}`}
          className="max-h-full max-w-full shadow-2xl"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          onError={(e) => console.error('Video Error:', e, activeClip.path)}
        />
      </div>

      {/* Transport Controls */}
      <div className="h-12 bg-bg-elevated border-t border-border-primary flex items-center px-4 space-x-4">
        <button 
          onClick={togglePlay}
          disabled={!activeClip}
          className="text-text-primary hover:text-accent focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPlaying ? (
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"></path></svg>
          ) : (
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
          )}
        </button>

        <div className="text-xs font-mono text-text-secondary w-20 text-center">
            {formatTime(currentTime)}
        </div>

        {/* Scrubber (Simple) */}
        <input
          type="range"
          min="0"
          max={activeClip ? activeClip.duration : 100}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          disabled={!activeClip}
          className="flex-1 h-1 bg-bg-surface rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent-hover"
        />
        
        <div className="text-xs font-mono text-text-muted w-20 text-center">
            {activeClip ? formatTime(activeClip.duration) : "00:00.0"}
        </div>
      </div>
    </div>
  );
};

export default Preview;
