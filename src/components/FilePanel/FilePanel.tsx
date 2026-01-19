import { useProjectStore } from '../../stores/useProjectStore';

const FilePanel = () => {
  const { clips, addClip, setActiveClip } = useProjectStore();

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
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-neutral-400">Project Files</h2>
        <button
          onClick={handleImport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition"
        >
          Import
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {clips.length === 0 ? (
          <div className="text-center text-neutral-600 text-sm mt-10">
            No clips imported.
          </div>
        ) : (
          clips.map((clip) => (
            <div
              key={clip.id}
              onClick={() => setActiveClip(clip.id)}
              className="p-2 bg-neutral-800 rounded hover:bg-neutral-700 cursor-pointer flex items-center space-x-3 group"
            >
              {clip.thumbnail ? (
                <img 
                  src={clip.thumbnail} 
                  alt="Thumbnail" 
                  className="w-10 h-10 object-cover rounded bg-black"
                />
              ) : (
                <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-xs text-neutral-500">
                   VIDEO
                </div>
              )}
              
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium truncate text-neutral-200 group-hover:text-white">{clip.name}</div>
                <div className="text-xs text-neutral-500">{clip.duration.toFixed(1)}s</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FilePanel;
