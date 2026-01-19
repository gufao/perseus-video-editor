import { useState, useRef } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import clsx from 'clsx';

const Timeline = () => {
  const { clips, activeClipId, setActiveClip, currentTime, reorderClips, updateClip } = useProjectStore();
  const [pixelsPerSecond, setPixelsPerSecond] = useState(10);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Trimming state
  const [trimming, setTrimming] = useState<{ id: string; type: 'start' | 'end'; initialX: number; initialValue: number } | null>(null);

  const handleDragStart = (index: number) => {
    if (trimming) return; // Don't drag if we are trimming
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderClips(draggedIndex, index);
    }
    setDraggedIndex(null);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900">
      {/* Timeline Toolbar (Zoom) */}
      <div className="h-8 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900/50">
        <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Timeline</div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-neutral-500">Zoom</span>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={pixelsPerSecond} 
            onChange={(e) => setPixelsPerSecond(parseInt(e.target.value))}
            className="w-24 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Track Area */}
      <div className="flex-1 overflow-x-auto p-4 relative">
        <div className="flex h-24 items-center">
           {clips.map((clip, index) => {
             const width = Math.max(20, clip.duration * pixelsPerSecond);
             const isActive = activeClipId === clip.id;
             
             return (
               <div
                 key={clip.id}
                 draggable={!trimming}
                 onDragStart={() => handleDragStart(index)}
                 onDragOver={handleDragOver}
                 onDrop={() => handleDrop(index)}
                 onClick={() => setActiveClip(clip.id)}
                 className={clsx(
                   "h-20 rounded border border-neutral-700 cursor-pointer select-none transition flex flex-col justify-between relative overflow-visible group",
                   isActive ? "bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "bg-neutral-800 hover:bg-neutral-750",
                   draggedIndex === index && "opacity-50 grayscale"
                 )}
                 style={{ 
                    width: `${width}px`, 
                    minWidth: `${width}px`, 
                    marginLeft: index > 0 ? '2px' : '0',
                    // Waveform styles
                    backgroundImage: clip.waveform ? `url(${clip.waveform})` : undefined,
                    backgroundSize: `${clip.sourceDuration * pixelsPerSecond}px 100%`,
                    backgroundPosition: `-${clip.start * pixelsPerSecond}px 0`,
                    backgroundRepeat: 'no-repeat'
                 }}
               >
                 {/* Trim Handles */}
                 <div 
                   className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500/0 group-hover:bg-blue-500/20 hover:!bg-blue-500 z-30 transition-colors rounded-l"
                   onMouseDown={(e) => startTrim(e, clip.id, 'start', clip.start)}
                 />
                 <div 
                   className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500/0 group-hover:bg-blue-500/20 hover:!bg-blue-500 z-30 transition-colors rounded-r"
                   onMouseDown={(e) => startTrim(e, clip.id, 'end', clip.end)}
                 />

                 <div className="p-2 overflow-hidden pointer-events-none">
                    <div className="text-[10px] font-medium truncate text-neutral-300 z-10">{clip.name}</div>
                 </div>
                 
                 {/* Playhead for active clip (local) */}
                 {isActive && (
                   <div 
                     className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_8px_rgba(239,44,44,0.5)] pointer-events-none"
                     style={{ left: `${currentTime * pixelsPerSecond}px` }}
                   />
                 )}
                 
                 <div className="p-2 pt-0 z-10 text-right pointer-events-none">
                    <div className="text-[9px] text-neutral-500">{clip.duration.toFixed(1)}s</div>
                 </div>
               </div>
             );
           })}
           {clips.length === 0 && (
             <div className="text-neutral-600 text-sm ml-4 italic">Import videos to start editing</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
