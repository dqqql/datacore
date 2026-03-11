import { FeaturePage } from "@/components/feature-page";
import { requirePlayerCharacter } from "@/lib/auth-helpers";

export default async function RulebookShopPage() {
  await requirePlayerCharacter();

  return (
    <FeaturePage
      title="官方规则书物品"
      badge="Rulebook Items"
      description="这里作为官方规则书物品的独立浏览入口，当前以目录检视和分类核对为主。"
      bullets={[
        "官方规则书物品与自定义物品都走同一套基础商品结构。",
        "当前页面用于核对来源、分类和导入组织方式。",
        "批量导入和复杂筛选不在本轮手工验收范围内。",
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
