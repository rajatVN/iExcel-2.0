import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <Brand subtitle="Assessment administration" />
        <h1 className="mb-6 mt-8 text-xl font-semibold tracking-tight">Admin sign in</h1>
        <LoginForm mode="admin" />
      </div>
    </div>
  );
}
