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

### 本地开发

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
```

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

导入本仓库，Framework Preset **Next.js**。  
若后端暂无 HTTPS：使用 **`NEXT_PUBLIC_API_BASE_URL=/api/backend`** + **`ANALYZER_BACKEND_URL=http://...`**（见上文）。
