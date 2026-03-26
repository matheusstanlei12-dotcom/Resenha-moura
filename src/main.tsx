import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Diagnóstico para erros em celulares (exibe alertas na tela caso a aplicação quebre)
window.onerror = function (msg, url, lineNo, columnNo, error) {
  alert('🚨 Erro de carregamento: ' + msg + '\nLinha: ' + lineNo + (error ? '\nDetalhes: ' + error : ''));
  return false;
};

window.onunhandledrejection = function (event) {
  alert('🚨 Erro Assíncrono: ' + event.reason);
};

createRoot(document.getElementById('root')!).render(

  <StrictMode>
    <App />
  </StrictMode>,
)
