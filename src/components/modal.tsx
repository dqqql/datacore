"use client";

import { useEffect, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[rgba(43,33,23,0.42)] backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        ref={modalRef}
        className="panel-strong relative w-full max-w-lg overflow-hidden rounded-[32px] shadow-[0_32px_80px_rgba(43,33,23,0.28)] animate-in zoom-in-95 fade-in duration-300 fill-mode-forwards"
      >
        <div className="p-6 sm:p-8">
          <header className="mb-4">
            <h3 className="section-title text-2xl font-semibold text-[var(--color-ink-900)]">
              {title}
            </h3>
          </header>
          
          <main className="text-[var(--muted)] leading-relaxed">
            {children}
          </main>
          
          {footer && (
            <footer className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
