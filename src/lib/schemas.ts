import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(40),
  password: z.string().min(1).max(128),
});

export const createCharacterSchema = z.object({
  name: z.string().trim().min(1, "角色名不能为空").max(40, "角色名不能超过 40 个字符"),
});

export const updateCharacterEconomySchema = z.object({
  characterId: z.string().trim().min(1),
  gold: z.coerce.number().int().min(0).max(999999),
  reputation: z.coerce.number().int().min(0).max(999999),
});

export const selectCharacterSchema = z.object({
  characterId: z.string().trim().min(1),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(1, "账号不能为空").max(40, "账号不能超过 40 个字符"),
  password: z.string().min(6, "密码至少 6 位").max(128, "密码长度过长"),
});

export const createPrivateItemSchema = z.object({
  characterId: z.string().trim().min(1),
  name: z.string().trim().min(1, "物品名称不能为空").max(60, "物品名称不能超过 60 个字符"),
  description: z
    .string()
    .trim()
    .max(240, "物品描述不能超过 240 个字符")
    .optional()
    .transform((value) => value || undefined),
  quantity: z.coerce.number().int().min(1, "数量至少为 1").max(9999, "数量不能超过 9999"),
  unitPrice: z.coerce.number().int().min(0, "单价不能小于 0").max(999999, "单价不能超过 999999"),
});

export const purchaseShopItemSchema = z.object({
  characterId: z.string().trim().min(1),
  shopItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1, "购买数量至少为 1").max(999, "购买数量不能超过 999"),
});

export const sellbackInventoryItemSchema = z.object({
  characterId: z.string().trim().min(1),
  inventoryItemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1, "回收数量至少为 1").max(999, "回收数量不能超过 999"),
});

export const createMarketListingSchema = z.object({
  characterId: z.string().trim().min(1),
  inventoryItemId: z.string().trim().min(1),
});

export const cancelMarketListingSchema = z.object({
  characterId: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
});

export const purchaseMarketListingSchema = z.object({
  buyerCharacterId: z.string().trim().min(1),
  listingId: z.string().trim().min(1),
});

export const adjustUserHonorSchema = z.object({
  userId: z.string().trim().min(1),
  delta: z.coerce
    .number()
    .int("荣誉值变动必须是整数")
    .min(-999999, "单次荣誉值变动不能小于 -999999")
    .max(999999, "单次荣誉值变动不能大于 999999")
    .refine((value) => value !== 0, "荣誉值变动不能为 0"),
  reason: z.string().trim().min(1, "请填写调整原因").max(120, "原因不能超过 120 个字符"),
});

export const refreshPasswordPoolSchema = z.object({
  count: z.coerce
    .number()
    .int("密码数量必须是整数")
    .min(1, "至少生成 1 条密码")
    .max(1000, "首版单次最多生成 1000 条密码"),
});

const optionalShopText = z
  .string()
  .trim()
  .max(240, "字段长度不能超过 240 个字符")
  .optional()
  .transform((value) => value || undefined);

export const createShopItemSchema = z.object({
  shopId: z.string().trim().min(1),
  name: z.string().trim().min(1, "商品名称不能为空").max(60, "商品名称不能超过 60 个字符"),
  description: optionalShopText,
  category: z.string().trim().min(1, "分类不能为空").max(40, "分类不能超过 40 个字符"),
  price: z.coerce.number().int("价格必须是整数").min(0, "价格不能小于 0").max(999999, "价格不能超过 999999"),
  importedSource: optionalShopText,
  sortOrder: z.coerce
    .number()
    .int("排序必须是整数")
    .min(0, "排序不能小于 0")
    .max(9999, "排序不能超过 9999"),
  otpCode: z.string().trim().min(1, "请填写一次性密码").max(120, "一次性密码长度过长"),
});

export const updateShopItemSchema = z.object({
  shopItemId: z.string().trim().min(1),
  name: z.string().trim().min(1, "商品名称不能为空").max(60, "商品名称不能超过 60 个字符"),
  description: optionalShopText,
  category: z.string().trim().min(1, "分类不能为空").max(40, "分类不能超过 40 个字符"),
  price: z.coerce.number().int("价格必须是整数").min(0, "价格不能小于 0").max(999999, "价格不能超过 999999"),
  importedSource: optionalShopText,
  sortOrder: z.coerce
    .number()
    .int("排序必须是整数")
    .min(0, "排序不能小于 0")
    .max(9999, "排序不能超过 9999"),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
  otpCode: z.string().trim().min(1, "请填写一次性密码").max(120, "一次性密码长度过长"),
});
