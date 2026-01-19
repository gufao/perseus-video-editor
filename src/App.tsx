import FilePanel from './components/FilePanel/FilePanel';
import Preview from './components/Preview/Preview';
import Timeline from './components/Timeline/Timeline';
import Toolbar from './components/Toolbar/Toolbar';

function App() {
  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white overflow-hidden">
      {/* Top Section: File Panel & Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File Panel */}
        <div className="w-1/4 min-w-[250px] border-r border-neutral-800 flex flex-col">
          <FilePanel />
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          <Preview />
        </div>
      </div>

      {/* Middle: Toolbar */}
      <div className="h-12 border-y border-neutral-800 bg-neutral-900 flex items-center px-4">
        <Toolbar />
      </div>

      {/* Bottom: Timeline */}
      <div className="h-1/3 min-h-[200px] bg-neutral-900 flex flex-col">
        <Timeline />
      </div>
    </div>
  );
}

export default App;