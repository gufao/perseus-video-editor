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
  addClip: (clip: Omit<Clip, 'id' | 'duration' | 'start' | 'end'> & { duration: number }) => void;
  removeClip: (id: string) => void;
  setActiveClip: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setNotification: (notification: Notification | null) => void;
  splitClip: (id: string, time: number) => void;
  reorderClips: (startIndex: number, endIndex: number) => void;
  updateClip: (id: string, updates: Partial<Clip>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  clips: [],
  activeClipId: null,
  currentTime: 0,
  isPlaying: false,
  notification: null,
  addClip: (clip) =>
    set((state) => ({
      clips: [...state.clips, { 
        ...clip, 
        id: uuidv4(),
        sourceDuration: clip.duration,
        start: 0,
        end: clip.duration
      }],
    })),
  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
      activeClipId: state.activeClipId === id ? null : state.activeClipId,
    })),
  setActiveClip: (id) => set({ activeClipId: id, currentTime: 0, isPlaying: false }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setNotification: (notification) => set({ notification }),
  reorderClips: (startIndex, endIndex) => set((state) => {
    const newClips = Array.from(state.clips);
    const [removed] = newClips.splice(startIndex, 1);
    newClips.splice(endIndex, 0, removed);
    return { clips: newClips };
  }),
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((clip) => {
      if (clip.id === id) {
        const newClip = { ...clip, ...updates };
        // Recalculate duration if bounds changed
        if (updates.start !== undefined || updates.end !== undefined) {
          newClip.duration = newClip.end - newClip.start;
        }
        return newClip;
      }
      return clip;
    }),
  })),
  splitClip: (id, time) => set((state) => {
    const clipIndex = state.clips.findIndex(c => c.id === id);
    if (clipIndex === -1) {
      console.warn('Split failed: Clip not found');
      return state;
    }
    
    const originalClip = state.clips[clipIndex];
    // Calculate absolute split time in source
    const splitTimeInSource = originalClip.start + time;

    console.log(`Attempting split: Clip ${id} at time ${time} (source time: ${splitTimeInSource})`);
    console.log(`Clip bounds: start=${originalClip.start}, end=${originalClip.end}`);

    // Allow a small buffer for float precision
    if (splitTimeInSource <= originalClip.start + 0.1 || splitTimeInSource >= originalClip.end - 0.1) {
      console.warn('Split failed: Split point too close to start or end');
      return state; // Invalid split
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

    return { clips: newClips };
  }),
}));
