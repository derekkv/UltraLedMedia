import * as React from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, Info, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import { useTheme } from '@/providers/theme';

export { toast } from 'sonner';

/**
 * Notificaciones efímeras. Estilo sobrio: superficie neutra elevada + icono con color
 * semántico (el color lo lleva el icono, no todo el recuadro). Sin ruido.
 */
export function Toaster(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <SonnerToaster
      theme={resolved}
      position="bottom-right"
      offset={{ bottom: '24px', right: '24px' }}
      mobileOffset={{ bottom: '84px', left: '12px', right: '12px' }}
      gap={10}
      duration={4000}
      closeButton
      icons={{
        success: <CheckCircle2 className="size-[18px] text-success" />,
        error: <XCircle className="size-[18px] text-destructive" />,
        warning: <TriangleAlert className="size-[18px] text-warning" />,
        info: <Info className="size-[18px] text-primary" />,
        loading: <Loader2 className="size-[18px] animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!bg-popover !text-foreground !border !border-border-strong !rounded-lg !gap-3 !px-4 !py-3 !font-sans elevated-2',
          title: '!text-[13px] !font-semibold !text-foreground',
          description: '!text-xs !text-muted-foreground',
          icon: '!m-0 !mt-px !size-[18px]',
          closeButton:
            '!left-auto !right-1 !top-1 !size-6 !translate-x-1/3 !-translate-y-1/3 !border-0 !bg-surface-2 !text-muted-foreground hover:!text-foreground',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md !text-xs !font-semibold',
          cancelButton: '!bg-surface-2 !text-foreground-secondary !rounded-md !text-xs',
        },
      }}
    />
  );
}
