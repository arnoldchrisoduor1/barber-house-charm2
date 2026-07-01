"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, BusinessCategoryProvider } from "@/hooks/useAuth";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BusinessCategoryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </BusinessCategoryProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
