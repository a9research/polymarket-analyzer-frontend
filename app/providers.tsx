"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

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
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "!bg-surface-container-highest !text-on-surface !font-jetbrains !text-xs",
          style: { border: "1px solid rgba(255,255,255,0.08)" },
        }}
      />
    </QueryClientProvider>
  );
}
