import { useRef, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import clsx from 'clsx';

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

  const handlePlay = () => {
    if (isSeeking.current) return;
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (isSeeking.current) return;
    setIsPlaying(false);
  };

  // UI Handlers for Custom Controls
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // Optionally pause while seeking
    // setIsPlaying(false); 
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
      <div className="text-neutral-600 flex flex-col items-center">
        <div className="mb-2">No clip selected</div>
        <div className="text-xs text-neutral-500">Select a clip from the Project Files or Timeline</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-black relative group">
      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="max-w-full max-h-full shadow-lg"
          // Controls removed
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
        />
        
        {/* Play overlay if paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 rounded-full p-4">
              <svg className="w-12 h-12 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        )}
      </div>

      {/* Custom Controls */}
      <div className="h-12 bg-neutral-900 border-t border-neutral-800 flex items-center px-4 space-x-4">
        <button 
          onClick={togglePlay}
          className="text-white hover:text-blue-400 focus:outline-none"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <div className="text-xs font-mono text-neutral-400 w-20 text-center">
          {formatTime(currentTime)}
        </div>

        <input 
          type="range"
          min={0}
          max={activeClip.duration}
          step={0.01}
          value={currentTime}
          onChange={handleSeekChange}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
        />

        <div className="text-xs font-mono text-neutral-500 w-20 text-center">
          {formatTime(activeClip.duration)}
        </div>
      </div>
    </div>
  );
};

export default Preview;
