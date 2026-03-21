# Polymarket Analyzer — Frontend

基于 **Stitch** 导出的「**Obsidian Terminal**」视觉（见仓库外素材 `官网设计/2/stitch` 与本文档 `docs/design/STITCH_DESIGN.md`）：深灰底、电蓝主色、霓虹绿/红盈亏、**Space Grotesk + Inter + JetBrains Mono**。

## 品牌资源

- **`public/logo.svg`**：站点左上角与浏览器图标（favicon）使用同一矢量文件（源自品牌素材 `logo.svg`）。

## 技术栈

- Next.js 14（App Router）+ TypeScript + Tailwind CSS  
- TanStack Query、Zustand（Watchlist 持久化）、lucide-react、react-hot-toast  
- Recharts（已安装，图表可逐步替换占位组件）

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 终端首页 + 榜单（`GET /leaderboard`） |
| `/account/[address]` | 单钱包报告（`GET /analyze/:wallet`） |
| `/watchlist` | 本地收藏列表 |

## 环境变量

复制 `.env.example` → `.env.local`：

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
```

生产环境指向 VPS 上 Analyzer 的 **HTTPS** 根 URL；后端需配置 **`PAA_CORS_ORIGINS`** 包含本站域名。

## 本地开发

```bash
npm install
npm run dev
```

另开终端启动 Rust `serve`（默认 `127.0.0.1:3000`）时，前端若同端口冲突，可将 Analyzer 改为 `3001` 并把 `NEXT_PUBLIC_API_BASE_URL` 设为 `http://127.0.0.1:3001`。

```bash
npm run build
npm run start
```

## Vercel

导入本仓库，Framework Preset **Next.js**，在 Environment 中设置 `NEXT_PUBLIC_API_BASE_URL`。
