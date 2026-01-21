import { useState } from 'react';
import { useProjectStore } from '../../stores/useProjectStore';
import clsx from 'clsx';

const FilePanel = () => {
  const { clips, addClip, setActiveClip, activeClipId } = useProjectStore();
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    console.log('Import clicked, checking API...', window.electronAPI);
    if (!window.electronAPI) {
      alert('Electron API not found!');
      return;
    }

    try {
      const filePaths = await window.electronAPI.openFile();
      console.log('File paths selected:', filePaths);
      
      if (filePaths && filePaths.length > 0) {
        setIsImporting(true);
        for (const path of filePaths) {
          console.log('Processing:', path);
          const name = path.split('/').pop() || 'Unknown';
          let duration = 10; // Default
          let thumbnail = undefined;

          try {
            const metadata = await window.electronAPI.getMetadata(path);
            console.log('Metadata:', metadata);
            if (metadata && metadata.duration) {
              duration = metadata.duration;
            }
          } catch (error) {
            console.warn('Failed to get metadata for', path, error);
          }

          try {
            const thumb = await window.electronAPI.getThumbnail(path);
            if (thumb) {
              thumbnail = thumb;
            }
          } catch (error) {
            console.warn('Failed to get thumbnail for', path, error);
          }

          let waveform = undefined;
          try {
            const wave = await window.electronAPI.getWaveform(path);
            if (wave) {
              waveform = wave;
            }
          } catch (error) {
            console.warn('Failed to get waveform for', path, error);
          }
  
          addClip({
            path,
            name,
            duration,
            sourceDuration: duration,
            thumbnail,
            waveform
          });
        }
      }
    } catch (e) {
      console.error('Error during import:', e);
      alert('Error during import: ' + e);
    } finally {
      setIsImporting(false);
    }
  };

    return (

      <div className="flex-1 flex flex-col h-full bg-bg-secondary relative">
        {isImporting && (
          <div className="absolute inset-0 z-50 bg-bg-secondary/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3"></div>
            <div className="text-sm font-medium text-accent animate-pulse">Importing media...</div>
          </div>
        )}

        <div className="p-4 border-b border-border-primary flex justify-between items-center">

          <h2 className="font-semibold text-sm uppercase tracking-wider text-text-secondary">Project Files</h2>

          <button 

            onClick={handleImport}

            className="bg-accent hover:bg-accent-hover text-bg-primary px-3 py-1 rounded text-xs font-bold transition"

          >

            Import

          </button>

        </div>

        

        <div className="flex-1 overflow-y-auto p-2 space-y-2">

          {clips.length === 0 ? (

            <div className="text-center text-text-muted text-sm mt-10">

              No files imported

            </div>

          ) : (

            clips.map((clip) => (

              <div 

                key={clip.id}

                onClick={() => setActiveClip(clip.id)}

                className={clsx(

                  "p-2 bg-bg-elevated rounded hover:bg-bg-surface cursor-pointer flex items-center space-x-3 group border border-transparent hover:border-border-primary transition-all",

                  activeClipId === clip.id ? "border-accent ring-1 ring-accent-dim" : ""

                )}

              >

                <div className="w-16 h-9 bg-bg-primary rounded overflow-hidden flex-shrink-0 relative">

                  {clip.thumbnail ? (

                    <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" />

                  ) : (

                    <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">

                      No img

                    </div>

                  )}

                </div>

                <div className="min-w-0 flex-1">

                  <div className="text-sm font-medium truncate text-text-primary group-hover:text-accent transition-colors">{clip.name}</div>

                  <div className="text-xs text-text-secondary">{clip.duration.toFixed(1)}s</div>

                </div>

              </div>

            ))

          )}

        </div>

      </div>

    );

  
};

export default FilePanel;
