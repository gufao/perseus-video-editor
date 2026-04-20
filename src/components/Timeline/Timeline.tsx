import { useState, useMemo, useCallback } from 'react';
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
    reorderClips, 
    updateClip,
    totalDuration,
    getClipAtGlobalTime,
    getClipPosition
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

  const handleDragStart = useCallback((index: number) => {
    if (trimming) return;
    setDraggedIndex(index);
    setDragOverIndex(null);
  }, [trimming]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null && draggedIndex !== index) {
      console.log('=== Drop Event ===');
      console.log('draggedIndex:', draggedIndex);
      console.log('dropIndex:', index);
      console.log('Before order:', clips.map((c, i) => `${i}:${c.name}`).join(', '));
      
      reorderClips(draggedIndex, index);
      
      console.log('After order should be updated');
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, reorderClips, clips]);

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

  const globalPlayheadPos = globalCurrentTime * pixelsPerSecond;
  const activeClipInPreview = getClipAtGlobalTime(globalCurrentTime);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (clips.length === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = clickX / pixelsPerSecond;
    
    if (clickTime >= 0 && clickTime <= totalDuration) {
      const clipInfo = getClipAtGlobalTime(clickTime);
      if (clipInfo) {
        setActiveClip(clipInfo.clip.id);
        setGlobalCurrentTime(clickTime);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="h-8 border-b border-border-primary flex items-center justify-between px-4 bg-bg-elevated/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">{t('timeline.title')}</div>
          {clips.length > 0 && (
            <div className="text-[10px] text-text-muted">
              {t('timeline.totalDuration')}: {totalDuration.toFixed(1)}s | {clips.length} clips
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

      <div className="flex-1 overflow-x-auto p-4 relative" onClick={handleTimelineClick}>
        <div className="flex h-24 items-center relative" style={{ minWidth: `${Math.max(800, totalDuration * pixelsPerSecond + 100)}px` }}>
           {clips.length > 0 && globalPlayheadPos >= 0 && (
             <div 
               className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_10px_rgba(239,68,68,0.6)] pointer-events-none"
               style={{ left: `${globalPlayheadPos}px` }}
             >
               <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-500" />
             </div>
           )}

           {clips.map((clip, index) => {
             const width = Math.max(60, clip.duration * pixelsPerSecond);
             const isActive = activeClipId === clip.id;
             const isDragOver = dragOverIndex === index && draggedIndex !== index;
             const isActiveInPreview = activeClipInPreview?.index === index;
             const isDragging = draggedIndex === index;
             
             return (
               <div
                 key={clip.id}
                 draggable={!trimming}
                 onDragStart={() => handleDragStart(index)}
                 onDragOver={(e) => handleDragOver(e, index)}
                 onDragLeave={handleDragLeave}
                 onDrop={(e) => handleDrop(e, index)}
                 onClick={(e) => {
                   e.stopPropagation();
                   setActiveClip(clip.id);
                   const position = getClipPosition(index);
                   if (position) {
                     setGlobalCurrentTime(position.start);
                   }
                 }}
                 className={clsx(
                   "h-20 rounded border cursor-move select-none transition flex flex-col justify-between relative overflow-visible group flex-shrink-0",
                   isActive 
                    ? "bg-accent-glow border-accent shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : isActiveInPreview
                    ? "bg-green-900/30 border-green-500/50"
                    : "bg-bg-elevated border-border-primary hover:bg-bg-surface hover:border-text-muted",
                   isDragging && "opacity-40 scale-95",
                   isDragOver && "ring-2 ring-accent ring-offset-1 ring-offset-bg-secondary"
                 )}
                 style={{ 
                    width: `${width}px`, 
                    marginLeft: index > 0 ? '2px' : '0',
                    backgroundImage: clip.waveform ? `url(${clip.waveform})` : undefined,
                    backgroundSize: `${clip.sourceDuration * pixelsPerSecond}px 200%`,
                    backgroundPosition: `-${clip.start * pixelsPerSecond}px center`,
                    backgroundRepeat: 'no-repeat'
                 }}
               >
                 {isDragOver && draggedIndex !== null && (
                   <div className={clsx(
                     "absolute top-0 bottom-0 w-1 bg-accent rounded z-40",
                     draggedIndex > index ? "-left-1" : "-right-1"
                   )} />
                 )}

                 <div 
                   className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-accent/0 group-hover:bg-accent/20 hover:!bg-accent z-30 transition-colors rounded-l"
                   onMouseDown={(e) => {
                     e.stopPropagation();
                     startTrim(e, clip.id, 'start', clip.start);
                   }}
                 />
                 <div 
                   className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-accent/0 group-hover:bg-accent/20 hover:!bg-accent z-30 transition-colors rounded-r"
                   onMouseDown={(e) => {
                     e.stopPropagation();
                     startTrim(e, clip.id, 'end', clip.end);
                   }}
                 />

                 <div className="p-2 overflow-hidden pointer-events-none">
                    <div className={clsx(
                        "text-[10px] font-medium truncate z-10",
                        isActive ? "text-accent" : isActiveInPreview ? "text-green-400" : "text-text-secondary"
                    )}>{clip.name}</div>
                    {isActiveInPreview && activeClipInPreview && (
                      <div className="text-[9px] text-green-400/80">
                        {t('timeline.playing')}: {activeClipInPreview.localTime.toFixed(1)}s
                      </div>
                    )}
                 </div>
                 
                 {isActive && !isActiveInPreview && (
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
