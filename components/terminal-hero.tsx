export function TerminalHero() {
  return (
    <section className="flex flex-col items-end justify-between gap-8 md:flex-row">
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-jetbrains text-xs tracking-widest text-secondary">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-secondary" />
          SYS.INIT // LIVE_FEED: CONNECTED
        </div>
        <h1 className="font-headline text-4xl font-bold tracking-tighter text-white sm:text-5xl md:text-7xl">
          TOP ALPHA <span className="text-primary-dim">LEADERS</span>
        </h1>
      </div>
      <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
        <div className="rounded-lg border-l-2 border-primary bg-surface-container-low p-4">
          <div className="mb-1 font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
            API // BASE
          </div>
          <div className="font-jetbrains text-sm font-medium text-white sm:text-base">
            配置 NEXT_PUBLIC_API_BASE_URL
          </div>
        </div>
        <div className="rounded-lg border-l-2 border-secondary bg-surface-container-low p-4">
          <div className="mb-1 font-jetbrains text-[10px] uppercase tracking-widest text-zinc-500">
            WS_CONN
          </div>
          <div className="font-jetbrains text-sm font-medium text-white sm:text-base">
            REST + PG 榜单
          </div>
        </div>
      </div>
    </section>
  );
}
