export const navigationGroups = [
  {
    title: "玩家功能",
    items: [
      { label: "总览", href: "/", badge: "首页" },
      { label: "登录", href: "/login", badge: "账号" },
      { label: "控制台", href: "/dashboard", badge: "入口" },
      { label: "角色列表", href: "/characters", badge: "角色" },
      { label: "玩家交易", href: "/market", badge: "市场" },
    ],
  },
  {
    title: "公共商店",
    items: [
      { label: "公会商店", href: "/shops/guild", badge: "金币" },
      { label: "荣誉商店", href: "/shops/honor", badge: "荣誉" },
    ],
  },
  {
    title: "后台管理",
    items: [
      { label: "账号与荣誉", href: "/admin/users", badge: "后台" },
      { label: "商店管理", href: "/admin/shops", badge: "商店" },
      { label: "密码池", href: "/admin/passwords", badge: "密码" },
      { label: "审计日志", href: "/admin/audit", badge: "审计" },
    ],
  },
] as const;
