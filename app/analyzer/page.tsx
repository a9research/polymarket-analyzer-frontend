import { Suspense } from "react";
import { AnalyzerView } from "./analyzer-view";

/**
 * 与 `SiteHeader` 内层一致：`mx-auto w-full max-w-[1920px] px-4 sm:px-6`。
 * 桌面 `lg+`：双栏锁定行高；左侧榜单仅列表区滚动；`?wallet=0x…` 时在右侧展示 `AccountDashboard`。
 */
export default function AnalyzerPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
          <p className="font-jetbrains text-sm text-zinc-500">…</p>
        </main>
      }
    >
      <AnalyzerView />
    </Suspense>
  );
}
