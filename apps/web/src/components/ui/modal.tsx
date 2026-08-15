import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { modalVariants, overlayVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, children, className }: ModalProps): React.ReactElement {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                style={{ x: '-50%', y: '-50%' }}
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-popover p-6 elevated-2 outline-none',
                  className,
                )}
              >
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;
export const ModalClose = Dialog.Close;
