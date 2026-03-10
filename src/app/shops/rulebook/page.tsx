import { FeaturePage } from "@/components/feature-page";
import { requirePlayerCharacter } from "@/lib/auth-helpers";

export default async function RulebookShopPage() {
  await requirePlayerCharacter();

  return (
    <FeaturePage
      title="官方规则书物品"
      badge="Rulebook Items"
      description="这里先作为独立入口或筛选页占位，后续可承接你批量导入的规则书物品，不把它做成独立子系统。"
      bullets={[
        "官方规则书物品与自定义物品都走同一套基础商品结构。",
        "首版先保留独立入口，方便后续做批量导入。",
        "当前骨架以分类检索为主，不加复杂筛选和搜索。",
      ]}
      columns={["来源", "物品", "分类", "是否导入"]}
      rows={[
        ["SRD", "治疗药水", "药剂", "否"],
        ["SRD", "长剑", "武器", "否"],
        ["西征自定义", "灰塔徽记", "凭证", "手动维护"],
      ]}
    />
  );
}
