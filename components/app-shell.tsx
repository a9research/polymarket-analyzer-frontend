"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const variant = pathname.startsWith("/account/")
    ? "account"
    : pathname === "/"
      ? "landing"
      : "home";
  const isAnalyzer = pathname === "/analyzer";

  return (
    <div
      className={
        isAnalyzer
          ? "flex h-dvh min-h-0 flex-col overflow-hidden"
          : "flex min-h-screen flex-col"
      }
    >
      <SiteHeader variant={variant} />
      <div
        className={
          isAnalyzer
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex flex-1 flex-col"
        }
      >
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
