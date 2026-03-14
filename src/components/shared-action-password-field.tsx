"use client";

import { useState } from "react";

type SharedActionPasswordFieldProps = {
  group: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  compact?: boolean;
};

export function SharedActionPasswordField({
  group,
  label = "当前账号密码",
  placeholder = "输入当前登录账号密码",
  helperText = "普通成员每次执行写操作前都需要输入当前账号密码；管理员可忽略。",
  compact = false,
}: SharedActionPasswordFieldProps) {
  const [password, setPassword] = useState("");

  const syncPassword = (value: string) => {
    setPassword(value);

    if (typeof document === "undefined") {
      return;
    }

    const fields = document.querySelectorAll<HTMLInputElement>(
      `input[data-shared-password-group="${group}"]`,
    );

    fields.forEach((field) => {
      field.value = value;
    });
  };

  return (
    <div className="space-y-2">
      <label className="field-label" htmlFor={`shared-action-password-${group}`}>
        {label}
      </label>
      <input
        id={`shared-action-password-${group}`}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => syncPassword(event.target.value)}
        placeholder={placeholder}
        className={`focus-ring field-input ${compact ? "field-compact" : ""}`}
      />
      <p className="text-sm leading-6 text-[var(--muted)]">{helperText}</p>
    </div>
  );
}
