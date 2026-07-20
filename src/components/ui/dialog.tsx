'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  contentClassName,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /** Classes for the inner scrollable region (padding/gap) — kept separate
   * from `className` (which sizes/positions the outer box) so a native
   * scrollbar never has to share a box with `rounded-2xl`: some browsers
   * don't clip a same-element scrollbar to its own border-radius, which
   * made the scrollbar cut across the dialog's rounded corner. */
  contentClassName?: string;
}) {
  // DialogHeader/DialogFooter are pulled out of the scrolling flex flow and
  // rendered as separate flex siblings of the popup (fixed header, scrolling
  // middle, fixed footer). They previously lived *inside* the scroll area
  // with `position: sticky`, but a sticky element's travel range spans its
  // whole flex container — it stuck to the bottom the entire time, visually
  // overlapping sibling fields that hadn't scrolled past that point yet.
  const childArray = React.Children.toArray(children);
  const isHeader = (child: React.ReactNode) => React.isValidElement(child) && child.type === DialogHeader;
  const isFooter = (child: React.ReactNode) => React.isValidElement(child) && child.type === DialogFooter;
  const header = childArray.filter(isHeader);
  const footer = childArray.filter(isFooter);
  const body = childArray.filter((child) => !isHeader(child) && !isFooter(child));

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl text-sm shadow-[var(--shadow-card-lg)] ring-1 duration-100 outline-none sm:max-w-sm',
          className,
        )}
        {...props}
      >
        {header}
        <div
          data-slot="dialog-scroll-area"
          className={cn('scrollbar-hidden flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5', contentClassName)}
        >
          {body}
        </div>
        {footer}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('bg-popover flex flex-col gap-2 border-b px-5 pt-5 pb-3', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'bg-muted/50 flex flex-col-reverse gap-2 rounded-b-2xl border-t p-5 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
