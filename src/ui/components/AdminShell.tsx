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
    <div className="admin-shell-canvas">
      <div className="admin-shell">
        <AdminTopBar action={action} />
        <div className="space-y-6">
          {title || subtitle ? (
            <header className="admin-heading">
              {title && (
                <p className="admin-heading__label">{title}</p>
              )}
              {subtitle && (
                <h1 className="admin-heading__title admin-heading__title--large">
                  {subtitle}
                </h1>
              )}
            </header>
          ) : null}

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AdminShell;
