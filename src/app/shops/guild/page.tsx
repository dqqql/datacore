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
  invalidPurchase: "购买失败，请检查角色、商品和数量后重试。",
  unavailable: "该商品当前不可购买，请刷新后重试。",
  insufficientGold: "当前角色金币不足，无法完成这次购买。",
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
      description="公会商店现在已经接入真实商品与购买动作。结算货币固定为金币，购买结果会直接进入当前角色背包。"
      badge="Guild Shop"
    >
      <ShopPage
        title="金币结算的公共商店"
        badge="Guild Catalog"
        description="这里出售的是公共物品。它们只能从系统商店买入，也只能在角色页按当前售价半价卖回。"
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
