import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';

const Toolbar = () => {
  const { activeClipId, currentTime, removeClip, splitClip, clips, setNotification } = useProjectStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const activeClip = clips.find(c => c.id === activeClipId);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onExportProgress) {
      window.electronAPI.onExportProgress((percent) => {
        setExportProgress(percent);
      });
    }
  }, []);

  const handleSplit = () => {
    if (activeClipId) {
      splitClip(activeClipId, currentTime);
    }
  };

  const handleDelete = () => {
    if (activeClipId) {
      removeClip(activeClipId);
    }
  };

  const runExport = async (clipsToExport: any[]) => {
    const outputPath = await window.electronAPI.saveFile();
    if (outputPath) {
      setIsExporting(true);
      setExportProgress(0);
      try {
        await window.electronAPI.exportVideo(clipsToExport, outputPath);
        setNotification({ type: 'success', message: 'Export Complete Successfully!' });
      } catch (error) {
        console.error(error);
        setNotification({ type: 'error', message: 'Export Failed. See console.' });
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
    }
  };

  const handleExportProject = () => {
    if (clips.length === 0) return;
    runExport(clips);
  };

  const handleExportClip = () => {
    if (!activeClip) return;
    runExport([activeClip]);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-2">
        <button 
          onClick={handleSplit}
          disabled={!activeClipId || isExporting}
          className="text-text-muted hover:text-text-primary p-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
          title="Split"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
        </button>
        <button 
          onClick={handleDelete}
          disabled={!activeClipId || isExporting}
          className="text-text-muted hover:text-red-500 p-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
      
      <div className="flex-1 flex justify-center">
         {isExporting && (
             <div className="flex items-center space-x-2 w-64">
                <div className="text-xs text-accent font-medium whitespace-nowrap">Exporting... {Math.round(exportProgress)}%</div>
                <div className="h-2 bg-bg-elevated rounded-full flex-1 overflow-hidden border border-border-primary">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, exportProgress))}%` }}
                  />
                </div>
             </div>
         )}
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={handleExportClip}
          disabled={!activeClip || isExporting}
          className="text-text-muted hover:text-text-primary text-xs font-medium uppercase transition disabled:opacity-50" 
          title="Export only the selected clip"
        >
          Export Clip
        </button>
        
        <div className="w-px h-4 bg-border-primary"></div>

        <button 
          onClick={handleExportProject}
          disabled={clips.length === 0 || isExporting}
          className="bg-accent hover:bg-accent-hover text-bg-primary px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 disabled:bg-bg-elevated disabled:text-text-muted" 
          title="Export entire timeline"
        >
           Export Project
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
