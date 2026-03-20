import { AccountDashboard } from "@/components/account-dashboard";

type Props = {
  params: { address: string };
};

export default function AccountPage({ params }: Props) {
  const address = decodeURIComponent(params.address);
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="font-headline text-lg font-bold uppercase tracking-tighter text-white sm:text-2xl">
          Polymarket Analyzer
        </span>
        <span className="rounded bg-zinc-800/50 px-2 py-0.5 font-jetbrains text-[10px] text-zinc-500">
          ACCOUNT_VIEW
        </span>
      </div>
      <AccountDashboard address={address} />
    </main>
  );
}
