import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from '@/providers/theme';

export { toast } from 'sonner';

export function Toaster(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <SonnerToaster
      theme={resolved}
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );
}
