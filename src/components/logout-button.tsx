"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/login/actions";

export function LogoutButton() {
  const [, action, isPending] = useActionState(logoutAction, null);

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={isPending}
        className="focus-ring btn-danger w-full mt-4"
      >
        {isPending ? "正在离开公会..." : "退出登录并切换账号"}
      </button>
    </form>
  );
}
