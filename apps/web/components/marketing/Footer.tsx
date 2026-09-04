import Link from "next/link";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-xl text-gradient-gold">Haus of Wellness</p>
          <p className="mt-1 text-sm text-muted-foreground">Multi-tenant SaaS for grooming, beauty, wellness & retail.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex min-h-11 items-center hover:text-foreground">
            Sign in
          </Link>
          <Link href="/get-started" className="inline-flex min-h-11 items-center hover:text-foreground">
            Get started
          </Link>
        </div>
      </div>
    </footer>
  );
}
