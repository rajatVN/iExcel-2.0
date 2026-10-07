import { Brand } from "./Brand";
import { LogoutButton } from "./LogoutButton";

export function CandidateShell({
  candidate,
  children,
}: {
  candidate: { name: string; candidate_code: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-navy-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand dark />
          <div className="flex items-center gap-5">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <div className="font-medium text-white">{candidate.name}</div>
              <div className="text-blue-200/70">{candidate.candidate_code}</div>
            </div>
            <LogoutButton className="!text-blue-100/80 hover:!text-white" />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
