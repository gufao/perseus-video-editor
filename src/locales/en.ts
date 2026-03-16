export const en = {
  common: {
    import: 'Import',
    cancel: 'Cancel',
    delete: 'Delete',
    split: 'Split',
    error: 'Error',
    success: 'Success',
    loading: 'Loading...',
  },
  filePanel: {
    title: 'Project Files',
    importing: 'Importing media...',
    noFiles: 'No files imported',
    noImg: 'No img',
    importError: 'Error during import',
    apiError: 'Desktop API not available!',
  },
  timeline: {
    title: 'Timeline',
    zoom: 'Zoom',
    emptyState: 'Import videos to start editing',
  },
  preview: {
    noClipSelected: 'No clip selected',
    selectClipHint: 'Select a clip from the Project Files or Timeline',
  },
  toolbar: {
    exporting: 'Exporting...',
    exportClip: 'Export Clip',
    exportProject: 'Export Project',
    exportClipTitle: 'Export only the selected clip',
    exportProjectTitle: 'Export entire timeline',
    exportSuccess: 'Export Complete Successfully!',
    exportError: 'Export Failed. See console.',
    splitTitle: 'Split',
    deleteTitle: 'Delete',
  }
};

export type TranslationType = typeof en;
