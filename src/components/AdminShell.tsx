import Link from "next/link";
import { Brand } from "./Brand";
import { LogoutButton } from "./LogoutButton";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Brand subtitle="Assessment administration" />
            <Link href="/admin" className="text-sm font-medium text-ink-soft hover:text-ink">
              Candidates
            </Link>
          </div>
          <LogoutButton admin />
        </div>
      </header>
      {children}
    </div>
  );
}
