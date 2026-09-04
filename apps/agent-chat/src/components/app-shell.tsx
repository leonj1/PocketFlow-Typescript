"use client";

import { AppHeader } from "@/components/app-header";
import { RequestyKeyProvider } from "@/components/requesty-key-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequestyKeyProvider>
      <AppHeader />
      <main className="app-main">{children}</main>
    </RequestyKeyProvider>
  );
}
