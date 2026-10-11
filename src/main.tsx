import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles/app.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastProvider';
import { FinanceProvider } from './context/FinanceProvider';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <FinanceProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </FinanceProvider>
    </ErrorBoundary>
  </StrictMode>,
);
