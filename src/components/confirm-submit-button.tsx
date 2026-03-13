"use client";

import { useFormStatus } from "react-dom";
import type { MouseEvent, ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
};

export function ConfirmSubmitButton({
  children,
  className,
  confirmMessage,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      className={`${className} ${pending ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "处理中..." : children}
    </button>
  );
}
