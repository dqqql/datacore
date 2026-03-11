import { AppShell } from "@/components/app-shell";
import { ShopPage } from "@/components/shop-page";
import { ensureDefaultShops } from "@/lib/bootstrap-shops";
import { requirePlayerCharacter } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type GuildShopPageProps = {
  searchParams: Promise<{
    shopError?: string;
    shopSuccess?: string;
  }>;
};

const guildShopMessages = {
  invalidPurchase: "购买失败，请检查角色、商品与数量后重试。",
  unavailable: "该商品当前不可购买，请刷新页面后重试。",
  insufficientGold: "当前角色金币不足，无法完成此次购买。",
  completed: "购买成功，公共物品已写入当前角色背包。",
} as const;

export default async function GuildShopPage({ searchParams }: GuildShopPageProps) {
  await ensureDefaultShops();

  const query = await searchParams;
  const { currentCharacter } = await requirePlayerCharacter();

  const shop = await prisma.shop.findUnique({
    where: { slug: "guild" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const shopErrorMessage =
    query.shopError === "invalid-purchase"
      ? guildShopMessages.invalidPurchase
      : query.shopError === "purchase-unavailable"
        ? guildShopMessages.unavailable
        : query.shopError === "insufficient-gold"
          ? guildShopMessages.insufficientGold
          : null;

  const shopSuccessMessage =
    query.shopSuccess === "purchase-completed" ? guildShopMessages.completed : null;

  return (
    <AppShell
      title="公会商店"
      description="公会商店提供以金币结算的公共物品。购买结果将直接进入当前角色背包。"
      badge="商店"
    >
      <ShopPage
        title="金币结算的公共商店"
        badge="Guild Catalog"
        description="此处售卖的均为公共物品，只能由系统商店售出，并仅可在角色页按当前售价半价回收。"
        currencyLabel="金币"
        balanceLabel="当前角色金币"
        balanceValue={currentCharacter?.gold ?? 0}
        shopPath="/shops/guild"
        shopName={shop?.name ?? "公会商店"}
        shopDescription={shop?.description}
        items={shop?.items ?? []}
        currentCharacter={currentCharacter ? { id: currentCharacter.id, name: currentCharacter.name } : null}
        errorMessage={shopErrorMessage}
        successMessage={shopSuccessMessage}
      />
    </AppShell>
  );
}
