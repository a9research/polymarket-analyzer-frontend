import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/90",
        className,
      )}
    />
  );
}

/** 分析报告尚未返回时：分块显示转圈 + 文案（与骨架不同，避免「整页灰条一起出」的观感）。 */
export function AnalyzeBlockLoading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-xl border border-white/5 bg-surface-container-low/50 px-4 py-8 sm:min-h-[8rem]",
        className,
      )}
    >
      <Loader2
        className="h-7 w-7 shrink-0 animate-spin text-primary"
        aria-hidden
      />
      <span className="text-center font-jetbrains text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>
    </div>
  );
}

export function SkeletonProfileTitle() {
  return (
    <div className="space-y-2">
      <Bar className="h-8 w-48 sm:h-10 sm:w-64" />
      <Bar className="h-4 w-32" />
    </div>
  );
}

export function SkeletonKpiGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/5 bg-surface-container-low p-5 sm:p-6"
          >
            <Bar className="mb-3 h-3 w-20" />
            <Bar className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/5 bg-surface-container-low p-5 sm:p-6"
          >
            <Bar className="mb-3 h-3 w-24" />
            <Bar className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTableBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-container-low">
      <div className="border-b border-white/5 px-4 py-4 sm:px-6">
        <Bar className="h-4 w-40" />
      </div>
      <div className="divide-y divide-white/5 px-4 py-2 sm:px-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            <Bar className="h-3 flex-1" />
            <Bar className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonThreeCol() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-surface-container p-5 sm:p-6"
        >
          <Bar className="mb-6 h-3 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <Bar key={j} className="h-3 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPatterns() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-white/5 bg-surface-container-low p-6">
        <Bar className="mx-auto mb-4 h-32 w-32 rounded-full" />
      </div>
      <div className="md:col-span-2 rounded-xl border border-white/5 bg-surface-container-low p-6">
        <Bar className="mb-6 h-3 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonStrategy() {
  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-[#171717] to-[#0e0e0e] p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <Bar className="mb-4 h-3 w-40" />
          <Bar className="mb-4 h-10 w-full max-w-sm" />
          <Bar className="h-40 w-full" />
        </div>
        <div>
          <Bar className="mb-2 h-3 w-24" />
          <Bar className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonHighlights() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <SkeletonTableBlock rows={3} />
      <SkeletonTableBlock rows={3} />
    </div>
  );
}
