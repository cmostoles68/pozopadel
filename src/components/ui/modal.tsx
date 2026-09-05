"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
  /** Max width of the dialog panel: "sm" | "md" | "lg" | "xl". Defaults to "md". */
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Reusable, accessible, mobile-first modal built with pure Tailwind.
 * - Renders nothing when closed.
 * - Closes on overlay click, on Escape, or via the close button.
 * - Locks body scroll while open.
 */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar ayuda"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        tabIndex={-1}
      />

      {/* Panel */}
      <div
        className={`relative w-full ${SIZES[size]} max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl glass-panel border border-outline-variant/20 pattern-bg`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5 border-b border-outline-variant/10 bg-surface-lowest/60">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="material-symbols-outlined text-secondary-container shrink-0 text-[26px]">
                {icon}
              </span>
            )}
            <h2 className="font-display text-lg sm:text-xl font-bold text-on-surface truncate">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-high hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
