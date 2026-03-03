import Link from "next/link";
import { ReactNode } from "react";
import { AdminTopBar } from "./AdminTopBar";

const NAV_LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Birds", href: "/admin/birds" },
  { label: "Places", href: "/admin/places" },
  { label: "Phenomena", href: "/admin/phenomena" },
];

export type AdminShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumb?: ReactNode;
  action?: ReactNode;
};

export function AdminShell({
  children,
  title,
  subtitle,
  breadcrumb,
  action,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="admin-shell">
        <AdminTopBar breadcrumb={breadcrumb} action={action} />
        <div className="space-y-6">
          {title || subtitle ? (
            <header className="space-y-2">
              {breadcrumb}
              {title && (
                <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
                  {title}
                </p>
              )}
              {subtitle && <h1 className="text-3xl font-semibold">{subtitle}</h1>}
            </header>
          ) : null}
          <nav className="admin-nav">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="admin-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default AdminShell;
