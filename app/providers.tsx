"use client";

import { Suspense } from "react";
import { ThemeProvider } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Suspense>{children}</Suspense>
    </ThemeProvider>
  );
}
