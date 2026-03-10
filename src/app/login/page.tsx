import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="登录与身份校验"
      description="首版接入的是账号密码登录。账号由管理员创建，管理员密码通过独立挂载文件维护。"
      badge="Auth"
    >
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel rounded-[28px] p-6">
          <h3 className="section-title text-3xl font-semibold text-[var(--color-ink-900)]">
            从这里进入你的西征账簿
          </h3>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            当前风格遵循你锁定的方向：带有轻微中世纪魔法气质，但绝不牺牲表格可读性。
            登录成功后，普通玩家如果还没有角色，会被直接引导去创建首角色。
          </p>

          <div className="mt-5 space-y-3">
            {[
              "支持中文账号，账号名与系统显示名一致。",
              "管理员密码来自挂载文件，改密后下次登录即生效。",
              "普通玩家首个核心动作是创建角色，而不是先配置别的资料。",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--border-soft)] bg-[rgba(255,250,241,0.84)] px-4 py-3 text-sm leading-6 text-[var(--color-ink-700)]"
              >
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-[28px] p-6">
          <div className="mx-auto max-w-md">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                Credentials Login
              </p>
              <h3 className="section-title mt-3 text-2xl font-semibold text-[var(--color-ink-900)]">
                输入账号与密码
              </h3>
            </div>

            <LoginForm />
          </div>
        </article>
      </section>
    </AppShell>
  );
}
