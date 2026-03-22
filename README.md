# Polymarket Analyzer — Frontend

基于 **Stitch** 导出的「**Obsidian Terminal**」视觉（见仓库外素材 `官网设计/2/stitch` 与本文档 `docs/design/STITCH_DESIGN.md`）：深灰底、电蓝主色、霓虹绿/红盈亏、**Space Grotesk + Inter + JetBrains Mono**。

## 品牌资源

- **`public/logo.svg`**：站点左上角 Logo。  
- **`public/favicon.svg`**：浏览器标签页图标（`app/layout.tsx` metadata `icons`）。

## 技术栈

- Next.js 14（App Router）+ TypeScript + Tailwind CSS  
- TanStack Query、Zustand（Watchlist 持久化）、lucide-react、react-hot-toast  
- **wagmi + viem**（Polygon 注入钱包连接）  
- 中英 UI 文案：`messages/zh.json`、`messages/en.json` + `I18nProvider`（`localStorage` `paa-locale`）  
- Recharts（已安装，图表可逐步替换占位组件）

## Polymarket 官方数据（默认浏览器直连）

- **榜单**：`lib/polymarket-leaderboard.ts` 默认请求 `https://data-api.polymarket.com/v1/leaderboard?…`（用户浏览器 → 官方）。
- **公开资料**：`lib/polymarket-public-profile.ts` 默认请求 `https://gamma-api.polymarket.com/public-profile?address=…`。
- **user-stats / user-pnl**：`lib/polymarket-official-user-api.ts` — Data API `GET /v1/user-stats?proxyAddress=` + `user-pnl-api.polymarket.com/user-pnl?user_address=&interval=&fidelity=`（账户页区块，与自建 `analyze` 并行；说明见仓库 `docs/apii.md`）。

若部署环境 **CORS 拦截** 或需 **仅服务端出网**，可设 **`NEXT_PUBLIC_POLYMARKET_LEADERBOARD_SERVER_PROXY=1`** / **`NEXT_PUBLIC_POLYMARKET_GAMMA_SERVER_PROXY=1`**，改走下方同源代理路由。

## 同源 API 代理（可选，无密钥）

| 路径 | 说明 |
|------|------|
| `/api/polymarket-leaderboard` | Node 转发 Data API 榜单（见上，默认不用） |
| `/api/polymarket-public-profile?address=0x…` | Node 转发 Gamma `public-profile`（见上，默认不用） |

## 路由

| 路径 | 说明 |
|------|------|
| `/` | **Landing** 项目介绍与入口 CTA |
| `/analyzer` | **分析器主界面**：左侧 **排行榜**；**点击榜单行**或 **`?wallet=0x…`**（顶栏 / 主区搜索框，回车）在**右侧**内嵌 `GET /analyze/:wallet`；无 `wallet` 时右侧仅 **地址搜索框 + 简短说明**（`AnalyzerEmptyState`） |
| `/leaderboard`、`/watchlist` | 重定向到 **`/analyzer`**（兼容旧链接） |
| `/docs` | （可选）站内说明页；**顶栏「文档」** 与 Landing CTA 均 **新标签打开 `NEXT_PUBLIC_DOCS_URL`**（未配置时默认 `https://docs.polymarket.com`） |
| `/account/[address]` | 单钱包报告（`GET /analyze/:wallet`） |

## 环境变量

复制 `.env.example` → `.env.local`。

### 重要：Vercel（HTTPS）不能直连 `http://` 后端

页面在 **`https://*.vercel.app`** 时，若 `NEXT_PUBLIC_API_BASE_URL=http://你的VPS:3000`，浏览器会拦截请求（**Mixed Content**：HTTPS 页禁止访问 HTTP 资源），控制台可见 `blocked:mixed-content`。

**任选其一：**

1. **给 Analyzer 配 HTTPS**（Nginx / Caddy + 证书），然后：
   - `NEXT_PUBLIC_API_BASE_URL=https://api.你的域名.com`
   - 后端 `PAA_CORS_ORIGINS` 包含你的 Vercel 前端源站。

2. **同源代理（后端可继续用 HTTP）**  
   - Vercel 环境变量：
     - `NEXT_PUBLIC_API_BASE_URL=/api/backend`
     - `ANALYZER_BACKEND_URL=http://VPS_IP:3000`（或内网地址；**不要**加 `NEXT_PUBLIC_`）  
   - 浏览器只访问 `https://你的项目.vercel.app/api/backend/...`，由 Vercel 服务端转发到 VPS，**不再触发 Mixed Content**。  
   - 此时代理与后端同源策略无关，一般**不必**再为浏览器配 CORS（仍建议生产上 HTTPS）。

### 页脚外链（可选）

在 `.env.local` 中设置 `NEXT_PUBLIC_FOOTER_*`（见 `.env.example`）：**X、Discord、Telegram、Medium、文档、GitHub**。未配置或留空的项不会在页脚出现。文档链接优先 `NEXT_PUBLIC_FOOTER_DOCS_URL`，否则若已配置 `NEXT_PUBLIC_DOCS_URL` 则页脚也会显示「文档」并指向该 URL。

### 本地开发

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
```

## 本地开发

```bash
npm install
npm run dev
```

### 官方榜加载失败（直连或代理）

默认榜单在**浏览器内**请求官方 Data API，**不经过** Next 服务端。**`NEXT_PUBLIC_API_BASE_URL` 只影响自建 Analyzer API。**

- **直连失败**：检查网络、地区、广告拦截；可设 **`NEXT_PUBLIC_POLYMARKET_LEADERBOARD_URL`** 指向可访问的反代 base。
- **改用本站代理**：设 **`NEXT_PUBLIC_POLYMARKET_LEADERBOARD_SERVER_PROXY=1`**，此时由 `/api/polymarket-leaderboard` 代拉；若仍 502，多为 **Node 出网**问题：配置 **`HTTPS_PROXY`** / **`POLYMARKET_DATA_API_ORIGIN`**（见 `.env.example`），或试 **`NODE_OPTIONS=--dns-result-order=ipv4first`**。

另开终端启动 Rust `serve`（默认 `127.0.0.1:3000`）时，前端若同端口冲突，可将 Analyzer 改为 `3001` 并把 `NEXT_PUBLIC_API_BASE_URL` 设为 `http://127.0.0.1:3001`。

```bash
npm run build
npm run start
```

## Vercel

导入本仓库，Framework Preset **Next.js**。  
若后端暂无 HTTPS：使用 **`NEXT_PUBLIC_API_BASE_URL=/api/backend`** + **`ANALYZER_BACKEND_URL=http://...`**（见上文）。

榜单与 Gamma 资料已默认**浏览器直连**官方域名；不稳定时可改 **`NEXT_PUBLIC_POLYMARKET_LEADERBOARD_URL`** / **`NEXT_PUBLIC_POLYMARKET_GAMMA_ORIGIN`** 为反代，或开启 **`NEXT_PUBLIC_*_SERVER_PROXY=1`** 走 Vercel 服务端转发。
