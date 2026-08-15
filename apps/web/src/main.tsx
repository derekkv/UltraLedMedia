import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { routeTree } from './routeTree.gen';
import { queryClient } from './lib/query';
import { ThemeProvider } from './providers/theme';
import { ConfirmProvider } from './providers/confirm';
import { Toaster } from './components/toaster';
import './styles/theme.css';

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: { queryClient },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No se encontró el elemento #root');

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
          <Toaster />
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
