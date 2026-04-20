import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Clip {
  id: string;
  path: string;
  name: string;
  duration: number;
  sourceDuration: number;
  start: number;
  end: number;
  thumbnail?: string;
  waveform?: string;
}

export interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface ProjectState {
  clips: Clip[];
  activeClipId: string | null;
  currentTime: number;
  isPlaying: boolean;
  notification: Notification | null;
  globalCurrentTime: number;
  totalDuration: number;
  addClip: (clip: Omit<Clip, 'id' | 'duration' | 'start' | 'end'> & { duration: number }) => void;
  removeClip: (id: string) => void;
  setActiveClip: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setNotification: (notification: Notification | null) => void;
  splitClip: (id: string, time: number) => void;
  reorderClips: (startIndex: number, endIndex: number) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  setGlobalCurrentTime: (time: number) => void;
  getClipAtGlobalTime: (globalTime: number) => { clip: Clip; index: number; localTime: number } | null;
  getClipPosition: (index: number) => { start: number; end: number } | null;
}

const calculateTotalDuration = (clips: Clip[]): number => {
  return clips.reduce((sum, clip) => sum + clip.duration, 0);
};

const getClipPositions = (clips: Clip[]): { start: number; end: number }[] => {
  const positions: { start: number; end: number }[] = [];
  let currentPos = 0;
  clips.forEach(clip => {
    positions.push({ start: currentPos, end: currentPos + clip.duration });
    currentPos += clip.duration;
  });
  return positions;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  clips: [],
  activeClipId: null,
  currentTime: 0,
  isPlaying: false,
  notification: null,
  globalCurrentTime: 0,
  totalDuration: 0,
  addClip: (clip) =>
    set((state) => {
      const newClip = { 
        ...clip, 
        id: uuidv4(),
        sourceDuration: clip.duration,
        start: 0,
        end: clip.duration
      };
      
      const newClips = [...state.clips, newClip];
      const isFirstClip = state.clips.length === 0;
      
      return {
        clips: newClips,
        totalDuration: calculateTotalDuration(newClips),
        activeClipId: isFirstClip ? newClip.id : state.activeClipId,
        currentTime: isFirstClip ? 0 : state.currentTime,
        globalCurrentTime: isFirstClip ? 0 : state.globalCurrentTime
      };
    }),
  removeClip: (id) =>
    set((state) => {
      const newClips = state.clips.filter((c) => c.id !== id);
      const isRemovingActiveClip = state.activeClipId === id;
      let newActiveClipId = isRemovingActiveClip ? null : state.activeClipId;
      
      if (isRemovingActiveClip && newClips.length > 0) {
        const removedIndex = state.clips.findIndex(c => c.id === id);
        if (removedIndex > 0) {
          newActiveClipId = newClips[Math.min(removedIndex - 1, newClips.length - 1)].id;
        } else if (newClips.length > 0) {
          newActiveClipId = newClips[0].id;
        }
      }
      
      const newTotalDuration = calculateTotalDuration(newClips);
      const newGlobalCurrentTime = Math.min(state.globalCurrentTime, Math.max(0, newTotalDuration - 0.001));
      
      return {
        clips: newClips,
        activeClipId: newActiveClipId,
        totalDuration: newTotalDuration,
        globalCurrentTime: newGlobalCurrentTime
      };
    }),
  setActiveClip: (id) => set({ activeClipId: id, currentTime: 0, isPlaying: false }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setNotification: (notification) => set({ notification }),
  reorderClips: (startIndex, endIndex) => {
    console.log('=== reorderClips ===');
    console.log('startIndex:', startIndex, 'endIndex:', endIndex);
    
    set((state) => {
      if (startIndex === endIndex) return state;
      
      const newClips = Array.from(state.clips);
      console.log('Before:', newClips.map((c, i) => `${i}:${c.name}`).join(', '));
      
      const [removed] = newClips.splice(startIndex, 1);
      
      let insertIndex = endIndex;
      
      console.log('Inserting at index:', insertIndex);
      
      newClips.splice(insertIndex, 0, removed);
      
      console.log('After:', newClips.map((c, i) => `${i}:${c.name}`).join(', '));
      
      return { 
        clips: newClips,
        totalDuration: calculateTotalDuration(newClips)
      };
    });
  },
  updateClip: (id, updates) => set((state) => {
    const newClips = state.clips.map((clip) => {
      if (clip.id === id) {
        const newClip = { ...clip, ...updates };
        if (updates.start !== undefined || updates.end !== undefined) {
          newClip.duration = newClip.end - newClip.start;
        }
        return newClip;
      }
      return clip;
    });
    return {
      clips: newClips,
      totalDuration: calculateTotalDuration(newClips)
    };
  }),
  splitClip: (id, time) => set((state) => {
    const clipIndex = state.clips.findIndex(c => c.id === id);
    if (clipIndex === -1) {
      console.warn('Split failed: Clip not found');
      return state;
    }
    
    const originalClip = state.clips[clipIndex];
    const splitTimeInSource = originalClip.start + time;

    console.log(`Attempting split: Clip ${id} at time ${time} (source time: ${splitTimeInSource})`);
    console.log(`Clip bounds: start=${originalClip.start}, end=${originalClip.end}`);

    if (splitTimeInSource <= originalClip.start + 0.1 || splitTimeInSource >= originalClip.end - 0.1) {
      console.warn('Split failed: Split point too close to start or end');
      return state;
    }

    const firstPart: Clip = {
      ...originalClip,
      end: splitTimeInSource,
      duration: splitTimeInSource - originalClip.start
    };

    const secondPart: Clip = {
      ...originalClip,
      id: uuidv4(),
      start: splitTimeInSource,
      end: originalClip.end,
      duration: originalClip.end - splitTimeInSource,
      name: `${originalClip.name} (Part 2)`
    };

    const newClips = [...state.clips];
    newClips.splice(clipIndex, 1, firstPart, secondPart);
    console.log('Split successful');

    return { 
      clips: newClips,
      totalDuration: calculateTotalDuration(newClips)
    };
  }),
  setGlobalCurrentTime: (time) => set({ globalCurrentTime: time }),
  getClipAtGlobalTime: (globalTime: number) => {
    const state = get();
    const positions = getClipPositions(state.clips);
    for (let i = 0; i < state.clips.length; i++) {
      if (globalTime >= positions[i].start && globalTime < positions[i].end) {
        return {
          clip: state.clips[i],
          index: i,
          localTime: globalTime - positions[i].start
        };
      }
    }
    if (state.clips.length > 0 && Math.abs(globalTime - positions[state.clips.length - 1].end) < 0.1) {
      return {
        clip: state.clips[state.clips.length - 1],
        index: state.clips.length - 1,
        localTime: state.clips[state.clips.length - 1].duration
      };
    }
    return null;
  },
  getClipPosition: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.clips.length) return null;
    const positions = getClipPositions(state.clips);
    return positions[index];
  }
}));
