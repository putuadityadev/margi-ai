import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import './styles/index.css';

async function bootstrap(): Promise<void> {
  let devPanelNode: ReactNode = null;

  if (import.meta.env.VITE_API_MOCKS === 'true') {
    const { startMocks } = await import('./mocks/browser');
    await startMocks();
    const { DevPanel } = await import('./mocks/DevPanel');
    devPanelNode = <DevPanel />;
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root mount element in index.html');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <AppRouter />
        {devPanelNode}
      </AppProviders>
    </StrictMode>,
  );
}

void bootstrap();
