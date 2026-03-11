import type { CurrencyType, ShopType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadSrdItemsFromFile } from "@/lib/srd-parser";

type DefaultShopItem = {
  name: string;
  description?: string;
  category: string;
  price: number;
  priceLabel?: string;
  importedSource?: string;
  sortOrder: number;
};

type DefaultShop = {
  slug: string;
  name: string;
  type: ShopType;
  currency: CurrencyType;
  description?: string;
  sortOrder: number;
  items: DefaultShopItem[];
};

const baseShops: DefaultShop[] = [
  {
    slug: "guild",
    name: "公会商店",
    type: "GUILD",
    currency: "GOLD",
    description: "使用金币结算的常规公共商店。",
    sortOrder: 1,
    items: [
      {
        name: "止血药剂",
        description: "常备消耗品，适合野外任务携带。",
        category: "消耗品",
        price: 12,
        sortOrder: 1,
      },
      {
        name: "采集镰刀",
        description: "用于基础采集和材料处理。",
        category: "工具",
        price: 28,
        sortOrder: 2,
      },
      {
        name: "净化盐包",
        description: "用于临时驱散污秽与污染。",
        category: "素材",
        price: 9,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "honor",
    name: "荣誉商店",
    type: "HONOR",
    currency: "HONOR",
    description: "使用账号荣誉值结算的特殊商店。",
    sortOrder: 2,
    items: [
      {
        name: "5 荣誉锚定券",
        description: "锚定 5 荣誉值的标准流通物品。",
        category: "凭证",
        price: 5,
        sortOrder: 1,
      },
      {
        name: "星辉粉末",
        description: "适合仪式或高价值交换的稀有材料。",
        category: "稀有材料",
        price: 18,
        sortOrder: 2,
      },
      {
        name: "边陲勋章",
        description: "记录特殊贡献的荣誉凭证。",
        category: "装备许可",
        price: 30,
        sortOrder: 3,
      },
    ],
  },
  {
    slug: "rulebook",
    name: "规则书物品",
    type: "RULEBOOK",
    currency: "GOLD",
    description: "官方规则书与西征自定义物品入口。",
    sortOrder: 3,
    items: [
      {
        name: "灰塔徽记",
        description: "西征自定义物品，保留给管理员手工维护。",
        category: "凭证",
        price: 20,
        importedSource: "西征自定义",
        sortOrder: 999999,
      },
    ],
  },
];

async function ensureShopItems(shopId: string, items: DefaultShopItem[]) {
  for (const item of items) {
    const existing = await prisma.shopItem.findFirst({
      where: {
        shopId,
        name: item.name,
      },
    });

    if (existing) {
      await prisma.shopItem.update({
        where: { id: existing.id },
        data: {
          description: item.description,
          category: item.category,
          price: item.price,
          priceLabel: item.priceLabel,
          importedSource: item.importedSource,
          sortOrder: item.sortOrder,
        },
      });
      continue;
    }

    await prisma.shopItem.create({
      data: {
        shopId,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        priceLabel: item.priceLabel,
        importedSource: item.importedSource,
        sortOrder: item.sortOrder,
      },
    });
  }
}

export async function ensureDefaultShops() {
  const srdItems = await loadSrdItemsFromFile();
  const defaultShops: DefaultShop[] = baseShops.map((shop) =>
    shop.slug === "rulebook"
      ? {
          ...shop,
          items: [...srdItems, ...shop.items],
        }
      : shop,
  );

  for (const shop of defaultShops) {
    const record = await prisma.shop.upsert({
      where: { slug: shop.slug },
      update: {
        name: shop.name,
        type: shop.type,
        currency: shop.currency,
        description: shop.description,
        sortOrder: shop.sortOrder,
      },
      create: {
        slug: shop.slug,
        name: shop.name,
        type: shop.type,
        currency: shop.currency,
        description: shop.description,
        sortOrder: shop.sortOrder,
      },
    });

    await ensureShopItems(record.id, shop.items);
  }
}
