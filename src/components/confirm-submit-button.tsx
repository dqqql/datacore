"use client";

import { useFormStatus } from "react-dom";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Modal } from "./modal";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmTone?: "danger" | "primary";
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
  confirmTitle = "需要确认",
  confirmTone = "primary",
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Auto-close modal when submission starts
  useEffect(() => {
    if (pending) {
      setIsModalOpen(false);
    }
  }, [pending]);

  const handleTrigger = (e: React.MouseEvent) => {
    if (confirmMessage) {
      e.preventDefault();
      setIsModalOpen(true);
    }
  };

  const handleConfirm = () => {
    // Manually trigger the form submission since the modal button is portalled out of the form
    const form = triggerRef.current?.form;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type={confirmMessage ? "button" : "submit"}
        className={`${className} ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={handleTrigger}
        disabled={pending}
      >
        {pending ? "处理中..." : children}
      </button>

      {confirmMessage && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={confirmTitle}
          footer={
            <>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setIsModalOpen(false)}
                disabled={pending}
              >
                返回
              </button>
              <button
                type="button"
                className={`${confirmTone === "danger" ? "btn-danger" : "btn-primary"} w-full sm:w-auto`}
                onClick={handleConfirm}
                disabled={pending}
              >
                {pending ? "处理中..." : "确认执行"}
              </button>
            </>
          }
        >
          <p className="py-2 text-lg text-[var(--color-ink-900)]">{confirmMessage}</p>
        </Modal>
      )}
    </>
  );
}
