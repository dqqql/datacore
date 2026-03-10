"use server";

import { AuthError } from "next-auth";
import { signIn } from "../../../auth";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(_: LoginFormState, formData: FormData): Promise<LoginFormState> {
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "账号或密码不正确，请检查后重试。",
      };
    }

    throw error;
  }
}
