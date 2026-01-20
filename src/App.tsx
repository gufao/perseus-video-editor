import FilePanel from './components/FilePanel/FilePanel';
import Preview from './components/Preview/Preview';
import Timeline from './components/Timeline/Timeline';
import Toolbar from './components/Toolbar/Toolbar';
import Toast from './components/ui/Toast';

function App() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <Toast />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/4 min-w-[250px] border-r border-border-primary flex flex-col bg-bg-secondary">
          <FilePanel />
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-bg-primary flex flex-col">
          <Preview />
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-12 border-y border-border-primary bg-bg-elevated flex items-center px-4">
        <Toolbar />
      </div>

      {/* Timeline Area */}
      <div className="h-1/3 min-h-[200px] bg-bg-secondary flex flex-col">
        <Timeline />
      </div>
    </div>
  );
}

export default App;