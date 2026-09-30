import * as React from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Modal, ModalDescription, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

interface State {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
}

const DEFAULT_OPTIONS: ConfirmOptions = { title: '' };

export function ConfirmProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = React.useState<State>({ open: false, options: DEFAULT_OPTIONS });

  const confirm = React.useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const settle = React.useCallback(
    (value: boolean) => {
      state.resolve?.(value);
      setState((prev) => ({ ...prev, open: false }));
    },
    [state],
  );

  const { options } = state;
  const destructive = options.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={state.open} onOpenChange={(open) => !open && settle(false)} className="max-w-sm">
        <div className="flex gap-4">
          <div
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full',
              destructive ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary',
            )}
          >
            {destructive ? <TriangleAlert className="size-5" /> : <Info className="size-5" />}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <ModalTitle className="text-base font-semibold text-foreground">
              {options.title}
            </ModalTitle>
            {options.description && (
              <ModalDescription className="mt-1.5 text-sm text-muted-foreground">
                {options.description}
              </ModalDescription>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => settle(false)}>
            {options.cancelText ?? 'Cancelar'}
          </Button>
          <Button variant={options.variant ?? 'primary'} onClick={() => settle(true)}>
            {options.confirmText ?? 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}
