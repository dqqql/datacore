import { AppShell } from "@/components/app-shell";
import { ShopPage } from "@/components/shop-page";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HonorShopPageProps = {
  searchParams: Promise<{
    shopError?: string;
    shopSuccess?: string;
  }>;
};

const honorShopMessages = {
  invalidPurchase: "购买失败，请检查角色、商品与数量后重试。",
  unavailable: "该荣誉商品当前不可购买，请刷新页面后重试。",
  insufficientHonor: "当前账号荣誉值不足，无法完成此次购买。",
  passwordInvalid: "请输入当前账号密码后再执行购买。",
  completed: "购买成功，荣誉商店物品已写入当前角色背包。",
} as const;

export default async function HonorShopPage({ searchParams }: HonorShopPageProps) {
  await ensureDefaultShops();

  const query = await searchParams;
  const { user, currentCharacter } = await requirePlayerCharacter();

  const shop = await prisma.shop.findUnique({
    where: { slug: "honor" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const shopErrorMessage =
    query.shopError === "invalid-purchase"
      ? honorShopMessages.invalidPurchase
      : query.shopError === "purchase-unavailable"
        ? honorShopMessages.unavailable
        : query.shopError === "insufficient-honor"
          ? honorShopMessages.insufficientHonor
          : query.shopError === "password-invalid"
            ? honorShopMessages.passwordInvalid
          : null;

  const shopSuccessMessage =
    query.shopSuccess === "purchase-completed" ? honorShopMessages.completed : null;

  return (
    <AppShell
      title="荣誉商店"
      description="荣誉商店以账号荣誉值结算，购买结果仍归属于当前角色背包。"
      badge="商店"
    >
      <ShopPage
        title="荣誉值结算的特殊商店"
        badge="Honor Catalog"
        description="荣誉值绑定账号，因此扣减发生在账号维度；购买所得物品仍明确归属当前角色。"
        currencyLabel="荣誉值"
        balanceLabel="当前账号荣誉值"
        balanceValue={user.honor}
        shopPath="/shops/honor"
        shopName={shop?.name ?? "荣誉商店"}
        shopDescription={shop?.description}
        items={shop?.items ?? []}
        currentCharacter={currentCharacter ? { id: currentCharacter.id, name: currentCharacter.name } : null}
        errorMessage={shopErrorMessage}
        successMessage={shopSuccessMessage}
        passwordGroup="honor-shop-page"
      />
    </AppShell>
  );
}
