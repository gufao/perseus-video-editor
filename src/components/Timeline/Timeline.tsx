import { useState, useMemo } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import clsx from 'clsx';
import { useLanguage } from '../LanguageProvider';

const Timeline = () => {
  const { 
    clips, 
    activeClipId, 
    setActiveClip, 
    currentTime, 
    globalCurrentTime,
    isPreviewMode,
    reorderClips, 
    updateClip,
    totalDuration,
    setIsPreviewMode,
    setGlobalCurrentTime
  } = useProjectStore();
  const [pixelsPerSecond, setPixelsPerSecond] = useState(10);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const { t } = useLanguage();
  
  const [trimming, setTrimming] = useState<{ id: string; type: 'start' | 'end'; initialX: number; initialValue: number } | null>(null);

  const clipPositions = useMemo(() => {
    const positions: { start: number; end: number }[] = [];
    let currentPos = 0;
    clips.forEach(clip => {
      positions.push({ start: currentPos, end: currentPos + clip.duration });
      currentPos += clip.duration;
    });
    return positions;
  }, [clips]);

  const getClipAtGlobalTime = (globalTime: number): { clip: typeof clips[0]; index: number; localTime: number } | null => {
    for (let i = 0; i < clips.length; i++) {
      if (globalTime >= clipPositions[i].start && globalTime < clipPositions[i].end) {
        return {
          clip: clips[i],
          index: i,
          localTime: globalTime - clipPositions[i].start
        };
      }
    }
    return null;
  };

  const handleDragStart = (index: number) => {
    if (trimming) return;
    setDraggedIndex(index);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null && draggedIndex !== index) {
      let targetIndex: number;
      
      if (draggedIndex < index) {
        targetIndex = index - 1;
      } else {
        targetIndex = index;
      }
      
      if (targetIndex !== draggedIndex) {
        reorderClips(draggedIndex, targetIndex);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const startTrim = (e: React.MouseEvent, id: string, type: 'start' | 'end', initialValue: number) => {
    e.stopPropagation();
    setTrimming({ id, type, initialX: e.clientX, initialValue });

    const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - e.clientX;
        const deltaTime = deltaX / pixelsPerSecond;
        const clip = useProjectStore.getState().clips.find(c => c.id === id);
        if (!clip) return;

        if (type === 'start') {
            const newStart = Math.max(0, Math.min(clip.end - 0.1, initialValue + deltaTime));
            updateClip(id, { start: newStart });
        } else {
            const newEnd = Math.max(clip.start + 0.1, Math.min(clip.sourceDuration, initialValue + deltaTime));
            updateClip(id, { end: newEnd });
        }
    };

    const handleMouseUp = () => {
        setTrimming(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const globalPlayheadPos = isPreviewMode ? globalCurrentTime * pixelsPerSecond : -1;
  const activeClipInPreview = isPreviewMode ? getClipAtGlobalTime(globalCurrentTime) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      {/* Timeline Toolbar (Zoom + Preview Mode) */}
      <div className="h-8 border-b border-border-primary flex items-center justify-between px-4 bg-bg-elevated/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">{t('timeline.title')}</div>
          {clips.length > 0 && (
            <button
              onClick={() => {
                setIsPreviewMode(!isPreviewMode);
                if (!isPreviewMode) {
                  setGlobalCurrentTime(0);
                }
              }}
              className={clsx(
                "px-2 py-0.5 rounded text-xs font-medium transition",
                isPreviewMode
                  ? "bg-accent text-bg-primary"
                  : "bg-bg-surface text-text-secondary hover:bg-bg-hover"
              )}
            >
              {isPreviewMode ? t('timeline.previewModeActive') : t('timeline.previewMode')}
            </button>
          )}
          {isPreviewMode && clips.length > 0 && (
            <div className="text-[10px] text-text-muted">
              {t('timeline.totalDuration')}: {totalDuration.toFixed(1)}s
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-text-secondary">{t('timeline.zoom')}</span>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={pixelsPerSecond} 
            onChange={(e) => setPixelsPerSecond(parseInt(e.target.value))}
            className="w-24 h-1 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>

      {/* Track Area */}
      <div className="flex-1 overflow-x-auto p-4 relative">
        <div className="flex h-24 items-center relative">
           {/* Global Playhead Line (spans entire track area) */}
           {isPreviewMode && globalPlayheadPos >= 0 && (
             <div 
               className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_10px_rgba(239,68,68,0.6)] pointer-events-none"
               style={{ left: `${globalPlayheadPos}px` }}
             >
               {/* Playhead Head */}
               <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-500" />
             </div>
           )}

           {clips.map((clip, index) => {
             const width = Math.max(20, clip.duration * pixelsPerSecond);
             const isActive = activeClipId === clip.id;
             const isDragOver = dragOverIndex === index && draggedIndex !== index;
             const isActiveInPreview = activeClipInPreview?.index === index;
             
             return (
               <div
                 key={clip.id}
                 draggable={!trimming && !isPreviewMode}
                 onDragStart={() => handleDragStart(index)}
                 onDragOver={(e) => handleDragOver(e, index)}
                 onDragLeave={(e) => handleDragLeave(e)}
                 onDrop={(e) => handleDrop(e, index)}
                 onClick={() => !isPreviewMode && setActiveClip(clip.id)}
                 className={clsx(
                   "h-20 rounded border cursor-pointer select-none transition flex flex-col justify-between relative overflow-visible group",
                   isActive && !isPreviewMode
                    ? "bg-accent-glow border-accent shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : isActiveInPreview
                    ? "bg-green-900/30 border-green-500/50"
                    : "bg-bg-elevated border-border-primary hover:bg-bg-surface hover:border-text-muted",
                   draggedIndex === index && "opacity-50 grayscale",
                   isDragOver && "ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary"
                 )}
                 style={{ 
                    width: `${width}px`, 
                    minWidth: `${width}px`, 
                    marginLeft: index > 0 ? '2px' : '0',
                    backgroundImage: clip.waveform ? `url(${clip.waveform})` : undefined,
                    backgroundSize: `${clip.sourceDuration * pixelsPerSecond}px 200%`,
                    backgroundPosition: `-${clip.start * pixelsPerSecond}px center`,
                    backgroundRepeat: 'no-repeat'
                 }}
               >
                 {/* Drag Drop Indicator */}
                 {isDragOver && draggedIndex !== null && draggedIndex < index && (
                   <div className="absolute -right-1 top-0 bottom-0 w-1 bg-accent rounded z-40" />
                 )}
                 {isDragOver && draggedIndex !== null && draggedIndex > index && (
                   <div className="absolute -left-1 top-0 bottom-0 w-1 bg-accent rounded z-40" />
                 )}

                 {/* Trim Handles (only when not in preview mode) */}
                 {!isPreviewMode && (
                   <>
                     <div 
                       className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-accent/0 group-hover:bg-accent/20 hover:!bg-accent z-30 transition-colors rounded-l"
                       onMouseDown={(e) => startTrim(e, clip.id, 'start', clip.start)}
                     />
                     <div 
                       className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-accent/0 group-hover:bg-accent/20 hover:!bg-accent z-30 transition-colors rounded-r"
                       onMouseDown={(e) => startTrim(e, clip.id, 'end', clip.end)}
                     />
                   </>
                 )}

                 <div className="p-2 overflow-hidden pointer-events-none">
                    <div className={clsx(
                        "text-[10px] font-medium truncate z-10",
                        isActive && !isPreviewMode ? "text-accent" : isActiveInPreview ? "text-green-400" : "text-text-secondary"
                    )}>{clip.name}</div>
                    {isActiveInPreview && activeClipInPreview && (
                      <div className="text-[9px] text-green-400/80">
                        {t('timeline.playing')}: {activeClipInPreview.localTime.toFixed(1)}s
                      </div>
                    )}
                 </div>
                 
                 {/* Local Playhead for active clip (only when not in preview mode) */}
                 {isActive && !isPreviewMode && (
                   <div 
                     className="absolute top-0 bottom-0 w-0.5 bg-accent z-20 shadow-[0_0_8px_rgba(245,158,11,0.5)] pointer-events-none"
                     style={{ left: `${currentTime * pixelsPerSecond}px` }}
                   />
                 )}
                 
                 <div className="p-2 pt-0 z-10 text-right pointer-events-none">
                    <div className="text-[9px] text-text-muted">{clip.duration.toFixed(1)}s</div>
                 </div>
               </div>
             );
           })}
           {clips.length === 0 && (
             <div className="text-text-muted text-sm ml-4 italic">{t('timeline.emptyState')}</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
