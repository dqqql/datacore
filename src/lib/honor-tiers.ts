export type HonorTier = {
  level: number;
  name: string;
  minHonor: number;
  maxCharacterLevel: number;
  privileges: string[];
};

export const HONOR_TIERS: HonorTier[] = [
  {
    level: 1,
    name: "一级",
    minHonor: 0,
    maxCharacterLevel: 3,
    privileges: [
      "可使用QQ或第三方平台在该世界观下带团，带完一次短团后可直接升至二级",
      "担任小队长（额外 50% 荣誉值与 20% 金币奖励）",
      "小队长可自行把控参与玩家、人数与等级，可指定人或拒绝人；DM 只负责经营悬赏，游戏体验由玩家共同维护",
    ],
  },
  {
    level: 2,
    name: "二级",
    minHonor: 10,
    maxCharacterLevel: 6,
    privileges: [
      "申请使用 FVTT 带团（提供基础教程）",
      "开放公会商行与势力选择",
      "享受每周基本补贴（每周 2 荣誉值，至少完成一个任务才可领取）",
    ],
  },
  {
    level: 3,
    name: "三级",
    minHonor: 30,
    maxCharacterLevel: 9,
    privileges: [
      "开放锻造 / 炼金",
      "可在布告栏为自己的角色发布任务（采集炼金、锻造材料等）",
      "允许在据点经营自己的店铺",
    ],
  },
  {
    level: 4,
    name: "四级",
    minHonor: 50,
    maxCharacterLevel: 12,
    privileges: [
      "基本补贴提升至每周 3 荣誉值",
      "开放荣誉商店",
      "允许在据点拥有自己的庄园",
      "允许设计私设物品 / 法术 / 特性 / 装饰 / 菜肴 / 人物",
    ],
  },
  {
    level: 5,
    name: "五级",
    minHonor: 80,
    maxCharacterLevel: 15,
    privileges: [
      "允许自行设计模组与西征相关系统",
      "每次【不冻港】开团拥有优先选择权",
    ],
  },
];

export function getTierByHonor(honor: number): HonorTier {
  // Find the highest tier the user qualifies for
  const eligible = HONOR_TIERS.filter((t) => honor >= t.minHonor);
  return eligible[eligible.length - 1] ?? HONOR_TIERS[0];
}

export function getNextTier(currentLevel: number): HonorTier | null {
  return HONOR_TIERS.find((t) => t.level === currentLevel + 1) ?? null;
}
