"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ admin = false, className = "" }: { admin?: boolean; className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch(admin ? "/api/admin/logout" : "/api/auth/logout", { method: "POST" }).catch(() => {});
        router.replace(admin ? "/admin/login" : "/");
        router.refresh();
      }}
      className={`flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink ${className}`}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
