import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider'
import { LanguageProvider } from './components/LanguageProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="perseus-theme">
      <LanguageProvider defaultLanguage="en" storageKey="perseus-lang">
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
