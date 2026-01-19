import { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';

const Toolbar = () => {
  const { activeClipId, currentTime, removeClip, splitClip, clips } = useProjectStore();
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
        alert('Export complete!');
      } catch (error) {
        console.error(error);
        alert('Export failed. See console for details.');
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
          className="text-neutral-400 hover:text-white p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Split"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg>
        </button>
        <button 
          onClick={handleDelete}
          disabled={!activeClipId || isExporting}
          className="text-neutral-400 hover:text-white p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
      
      {isExporting ? (
        <div className="flex items-center space-x-2 flex-1 mx-4">
          <div className="text-xs text-blue-400 font-medium whitespace-nowrap">Exporting... {Math.round(exportProgress)}%</div>
          <div className="h-2 bg-neutral-800 rounded-full flex-1 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, exportProgress))}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportClip}
            disabled={!activeClip || isExporting}
            className="text-neutral-400 hover:text-white text-xs font-medium uppercase transition disabled:opacity-50" 
            title="Export only the selected clip"
          >
            Export Clip
          </button>
          
          <div className="w-px h-4 bg-neutral-700"></div>

          <button 
            onClick={handleExportProject}
            disabled={clips.length === 0 || isExporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition disabled:opacity-50 disabled:bg-neutral-800" 
            title="Export entire timeline"
          >
             Export Project
          </button>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
