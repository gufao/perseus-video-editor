import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Clip {
  id: string;
  path: string;
  name: string;
  duration: number; // Current duration (end - start)
  sourceDuration: number; // Total file duration
  start: number; // Start time in source file
  end: number; // End time in source file
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
  isPreviewMode: boolean;
  globalCurrentTime: number;
  totalDuration: number;
  activePreviewClipIndex: number | null;
  addClip: (clip: Omit<Clip, 'id' | 'duration' | 'start' | 'end'> & { duration: number }) => void;
  removeClip: (id: string) => void;
  setActiveClip: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setNotification: (notification: Notification | null) => void;
  splitClip: (id: string, time: number) => void;
  reorderClips: (startIndex: number, endIndex: number) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
  setIsPreviewMode: (enabled: boolean) => void;
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
  isPreviewMode: false,
  globalCurrentTime: 0,
  totalDuration: 0,
  activePreviewClipIndex: null,
  addClip: (clip) =>
    set((state) => {
      const newClips = [...state.clips, { 
        ...clip, 
        id: uuidv4(),
        sourceDuration: clip.duration,
        start: 0,
        end: clip.duration
      }];
      return {
        clips: newClips,
        totalDuration: calculateTotalDuration(newClips)
      };
    }),
  removeClip: (id) =>
    set((state) => {
      const newClips = state.clips.filter((c) => c.id !== id);
      return {
        clips: newClips,
        activeClipId: state.activeClipId === id ? null : state.activeClipId,
        totalDuration: calculateTotalDuration(newClips),
        globalCurrentTime: state.isPreviewMode ? Math.min(state.globalCurrentTime, calculateTotalDuration(newClips)) : state.globalCurrentTime
      };
    }),
  setActiveClip: (id) => set({ activeClipId: id, currentTime: 0, isPlaying: false }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setNotification: (notification) => set({ notification }),
  reorderClips: (startIndex, endIndex) => set((state) => {
    const newClips = Array.from(state.clips);
    const [removed] = newClips.splice(startIndex, 1);
    newClips.splice(endIndex, 0, removed);
    return { 
      clips: newClips,
      totalDuration: calculateTotalDuration(newClips)
    };
  }),
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
  setIsPreviewMode: (enabled) => set({ 
    isPreviewMode: enabled,
    globalCurrentTime: enabled ? 0 : get().globalCurrentTime,
    isPlaying: false,
    activePreviewClipIndex: null
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
    return null;
  },
  getClipPosition: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.clips.length) return null;
    const positions = getClipPositions(state.clips);
    return positions[index];
  }
}));
