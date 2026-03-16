import type { TranslationType } from './en';

export const pt_BR: TranslationType = {
  common: {
    import: 'Importar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    split: 'Dividir',
    error: 'Erro',
    success: 'Sucesso',
    loading: 'Carregando...',
  },
  filePanel: {
    title: 'Arquivos do Projeto',
    importing: 'Importando mídia...',
    noFiles: 'Nenhum arquivo importado',
    noImg: 'Sem img',
    importError: 'Erro durante a importação',
    apiError: 'API Desktop não disponível!',
  },
  timeline: {
    title: 'Linha do Tempo',
    zoom: 'Zoom',
    emptyState: 'Importe vídeos para começar a editar',
  },
  preview: {
    noClipSelected: 'Nenhum clipe selecionado',
    selectClipHint: 'Selecione um clipe nos Arquivos do Projeto ou na Linha do Tempo',
  },
  toolbar: {
    exporting: 'Exportando...',
    exportClip: 'Exportar Clipe',
    exportProject: 'Exportar Projeto',
    exportClipTitle: 'Exportar apenas o clipe selecionado',
    exportProjectTitle: 'Exportar linha do tempo inteira',
    exportSuccess: 'Exportação concluída com sucesso!',
    exportError: 'Falha na exportação. Veja o console.',
    splitTitle: 'Dividir',
    deleteTitle: 'Excluir',
  }
};
