import { TerminalHero } from "@/components/terminal-hero";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1920px] space-y-12 px-4 py-10 sm:px-6 sm:py-12">
      <TerminalHero />
      <LeaderboardTable />
    </main>
  );
}
