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
      <div
        className="mx-auto flex max-w-[var(--shell-main-max,1120px)] flex-col gap-10 px-[var(--shell-side-pad,24px)] py-8"
      >
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
          <div className="grid gap-3 lg:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex h-12 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/20"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
            <aside className="hidden lg:block">
              <div className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex h-12 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/20"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </aside>
            <main className="space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminShell;
