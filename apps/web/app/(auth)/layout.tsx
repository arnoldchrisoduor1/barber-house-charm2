import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="mesh-ambient" aria-hidden />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
