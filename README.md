# DND 数据管理中心

用于西征模式世界的账号、角色、背包、公共商店与玩家交易管理系统。

## 本地开发

```powershell
Copy-Item .env.example .env
npm install
npm run db:push
npm run dev
```

## 当前技术骨架

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Prisma
- SQLite
- Auth.js Credentials 已接入
- 管理员密码通过独立挂载文件同步到数据库

## 当前已固定的关键规则

- 账号由管理员创建，支持中文账号
- 登录后若没有角色，必须先创建首角色
- 荣誉值绑定账号，只能由管理员修改
- 金币和声望绑定角色，玩家可以自行填写
- 公共物品与私人物品严格分流
- 私人物品整条上架，不做部分成交
- 公共物品按当前商店售价半价回收
- 管理员密码通过独立挂载文件维护

## 当前已实现

- 管理员登录
- 管理员创建普通账号
- 首角色创建引导
- 当前角色切换
- 角色金币、声望修改
- 金币、声望修改审计留痕

## Docker 部署

本地 Windows 开发时不要求安装 Docker。
服务器部署路径默认是：

1. 本地开发并推送到 GitHub
2. Ubuntu 22.04 服务器拉取代码
3. 通过 Docker 构建和运行

当前仓库已包含 `Dockerfile`，但尚未在本机验证容器构建。
