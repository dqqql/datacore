"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateInventoryItemQuantityAction } from "@/app/characters/actions";
import { Modal } from "./modal";

type InventoryQuantityEditorButtonProps = {
  characterId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  requiresOtp?: boolean;
  disabled?: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="focus-ring btn-primary w-full sm:w-auto"
      disabled={pending}
    >
      {pending ? "保存中..." : "保存数量"}
    </button>
  );
}

export function InventoryQuantityEditorButton({
  characterId,
  inventoryItemId,
  itemName,
  quantity,
  requiresOtp = true,
  disabled = false,
}: InventoryQuantityEditorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (disabled) {
    return <span className="numeric text-[var(--muted)]">{new Intl.NumberFormat("zh-CN").format(quantity)}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring inline-flex min-w-16 items-center justify-end rounded-xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-3 py-1.5 text-right font-semibold text-[var(--color-ink-900)] transition hover:border-[rgba(127,92,47,0.28)] hover:text-[var(--accent-strong)]"
        aria-label={`修改 ${itemName} 数量，当前为 ${quantity}`}
      >
        {new Intl.NumberFormat("zh-CN").format(quantity)}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`修改“${itemName}”数量`}
      >
        <form action={updateInventoryItemQuantityAction} className="space-y-5">
          <input type="hidden" name="characterId" value={characterId} />
          <input type="hidden" name="inventoryItemId" value={inventoryItemId} />

          <div className="space-y-2">
            <label className="field-label" htmlFor={`inventory-quantity-${inventoryItemId}`}>
              物品数量
            </label>
            <input
              ref={inputRef}
              id={`inventory-quantity-${inventoryItemId}`}
              name="quantity"
              type="number"
              min={1}
              max={9999}
              required
              defaultValue={quantity}
              aria-describedby={hintId}
              className="focus-ring field-input"
            />
            <p id={hintId} className="text-sm leading-6 text-[var(--muted)]">
              仅支持大于等于 1 的正整数，输入 0 会被拦截。
            </p>
          </div>

          {requiresOtp ? (
            <div className="space-y-2">
              <label className="field-label" htmlFor={`inventory-quantity-otp-${inventoryItemId}`}>
                一次性密码
              </label>
              <input
                id={`inventory-quantity-otp-${inventoryItemId}`}
                name="otpCode"
                type="text"
                required
                maxLength={120}
                className="focus-ring field-input"
                placeholder="输入本次修改需消耗的 OTP"
              />
            </div>
          ) : (
            <div className="rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              当前为管理员账号，本次修改无需输入 OTP。
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="focus-ring btn-secondary w-full sm:w-auto"
              onClick={() => setIsOpen(false)}
            >
              取消
            </button>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}
