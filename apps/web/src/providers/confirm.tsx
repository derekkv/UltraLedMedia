import * as React from 'react';
import { Modal, ModalDescription, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

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

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={state.open} onOpenChange={(open) => !open && settle(false)}>
        <ModalTitle className="text-lg font-semibold text-foreground">{options.title}</ModalTitle>
        {options.description && (
          <ModalDescription className="mt-2 text-sm text-muted-foreground">
            {options.description}
          </ModalDescription>
        )}
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
