import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type WorkspacePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function WorkspacePanel({ open, onOpenChange, title, description, eyebrow, children, footer, className }: WorkspacePanelProps) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-y-0 right-0 left-0 z-50 bg-slate-950/30 backdrop-blur-[1px] lg:right-64" />
      <Dialog.Content className={cn('workspace-panel-enter fixed inset-y-0 left-0 z-[60] flex w-full max-w-[500px] flex-col border-r border-border bg-popover text-popover-foreground shadow-[18px_0_50px_rgba(15,23,42,.16)] focus:outline-none', className)}>
        <div className="flex items-start gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-primary">{eyebrow}</p>}
            <Dialog.Title className="text-xl font-bold tracking-tight text-foreground">{title}</Dialog.Title>
            {description && <Dialog.Description className="mt-1 text-sm leading-5 text-muted-foreground">{description}</Dialog.Description>}
          </div>
          <Dialog.Close className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring" aria-label="إغلاق اللوحة">
            <X className="size-4" />
          </Dialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">{children}</div>
        {footer && <div className="border-t border-border bg-muted px-5 py-4 sm:px-6">{footer}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
