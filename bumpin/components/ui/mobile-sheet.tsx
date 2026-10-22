"use client";

import { Drawer } from "vaul";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeLabel = "Close",
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  closeLabel?: string;
  footer?: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="mobile-sheet">
          <div className="sheet-grip" aria-hidden="true" />
          <header className="sheet-header">
            <div className="min-w-0">
              <Drawer.Title className="sheet-title">{title}</Drawer.Title>
              <Drawer.Description className="sheet-description">
                {description}
              </Drawer.Description>
            </div>
            <Drawer.Close
              className="icon-button shrink-0"
              aria-label={closeLabel}
            >
              <X size={21} />
            </Drawer.Close>
          </header>
          <div className="sheet-body">{children}</div>
          {footer && <div className="sheet-footer">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
