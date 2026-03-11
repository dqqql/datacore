"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="field-label" htmlFor="username">账号</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="focus-ring field-input"
          placeholder="请输入账号"
        />
      </div>

      <div className="space-y-2">
        <label className="field-label" htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="focus-ring field-input"
          placeholder="请输入密码"
        />
      </div>

      {state.error ? (
        <p className="status-message" data-tone="danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="focus-ring btn-primary w-full"
      >
        {isPending ? "正在验证身份..." : "进入系统"}
      </button>
    </form>
  );
}
