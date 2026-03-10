export const navigationGroups = [
  {
    title: "玩家侧",
    items: [
      { label: "总览", href: "/", badge: "Home" },
      { label: "登录", href: "/login", badge: "Auth" },
      { label: "控制台", href: "/dashboard", badge: "Start" },
      { label: "角色列表", href: "/characters", badge: "角色" },
      { label: "玩家交易", href: "/market", badge: "市场" },
    ],
  },
  {
    title: "公共商店",
    items: [
      { label: "公会商店", href: "/shops/guild", badge: "金币" },
      { label: "荣誉商店", href: "/shops/honor", badge: "荣誉" },
      { label: "规则书物品", href: "/shops/rulebook", badge: "分类" },
    ],
  },
  {
    title: "后台",
    items: [
      { label: "账号与荣誉", href: "/admin/users", badge: "Admin" },
      { label: "商店管理", href: "/admin/shops", badge: "Shop" },
      { label: "密码池", href: "/admin/passwords", badge: "OTP" },
      { label: "审计日志", href: "/admin/audit", badge: "Logs" },
    ],
  },
] as const;
