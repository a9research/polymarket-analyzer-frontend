"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";
import { I18nProvider } from "@/lib/i18n-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        <I18nProvider>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              className:
                "!bg-surface-container-highest !text-on-surface !font-jetbrains !text-xs",
              style: { border: "1px solid rgba(255,255,255,0.08)" },
            }}
          />
        </I18nProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
