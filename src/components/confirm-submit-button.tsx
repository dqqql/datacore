"use client";

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
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button type="submit" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
