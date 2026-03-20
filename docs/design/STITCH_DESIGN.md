# Stitch「Obsidian Terminal」设计系统

来源：本地素材 `官网设计/2/stitch/axiom_terminal/DESIGN.md` 与 `*/code.html` 中的 Tailwind 令牌。

本前端在 `tailwind.config.ts` 与 `app/globals.css` 中已实现同色板与字体栈：

- **Surface**：`#0e0e0e`（background / surface）
- **Container**：`surface-container-low` `#131313`、`surface-container` `#1a1919`、`surface-container-highest` `#262626`
- **Primary**：`#85adff`（电蓝）
- **Secondary**：`#00fd87`（霓虹绿，盈利/连接态）
- **Tertiary**：`#ff716b`（霓虹红，亏损）
- **字体**：Space Grotesk（headline）、Inter（body）、JetBrains Mono（数据/标签）

原则摘要：**避免重边框分区**（用背景阶与留白）、圆角 ≤ `lg`（8px）、终端文案（如 `SYS.INIT`）、数值用 `font-jetbrains`。

完整叙述请以素材目录中 **DESIGN.md** 为准。
