import { useLanguage } from './LanguageProvider';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center bg-bg-elevated border border-border-primary rounded-md overflow-hidden">
        <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 text-xs font-medium transition-colors ${
                language === 'en' 
                ? 'bg-accent text-bg-primary' 
                : 'text-text-muted hover:text-text-primary'
            }`}
        >
            EN
        </button>
        <button
            onClick={() => setLanguage('pt-BR')}
            className={`px-2 py-1 text-xs font-medium transition-colors ${
                language === 'pt-BR' 
                ? 'bg-accent text-bg-primary' 
                : 'text-text-muted hover:text-text-primary'
            }`}
        >
            PT
        </button>
    </div>
  );
}
