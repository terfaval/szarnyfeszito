import { ReactNode } from "react";
import { AdminTopBar } from "./AdminTopBar";

export type AdminShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
};

export function AdminShell({
  children,
  title,
  subtitle,
  action,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="admin-shell">
        <AdminTopBar action={action} />
        <div className="space-y-6">
          {title || subtitle ? (
            <header className="space-y-2">
              {title && (
                <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
                  {title}
                </p>
              )}
              {subtitle && <h1 className="text-3xl font-semibold">{subtitle}</h1>}
            </header>
          ) : null}

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AdminShell;
