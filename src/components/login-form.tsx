"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="username">
          账号
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
          placeholder="请输入账号"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--color-ink-700)]" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="focus-ring w-full rounded-2xl border border-[var(--border-strong)] bg-[rgba(255,250,241,0.95)] px-4 py-3 text-sm text-[var(--color-ink-900)]"
          placeholder="请输入密码"
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-[rgba(165,63,43,0.2)] bg-[rgba(165,63,43,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="focus-ring inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(95,66,31,0.22)] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "正在验证身份..." : "进入系统"}
      </button>
    </form>
  );
}
