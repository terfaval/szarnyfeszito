"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const NAV_LINKS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Birds", href: "/admin/birds" },
  { label: "Yoga", href: "/admin/yoga" },
  { label: "Places", href: "/admin/places" },
  { label: "Phenomena", href: "/admin/phenomena" },
];

export type AdminTopBarProps = {
  action?: ReactNode;
};

export function AdminTopBar({ action }: AdminTopBarProps) {
  const pathname = usePathname() ?? "";
  const logoSrc = pathname.startsWith("/admin/yoga") ? "/YOGA/ICONS/logo.svg" : "/logo.svg";

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="admin-topbar">
      <div className="admin-topbar__inner">
        <div className="admin-topbar__brand">
          <Link
            href="/admin"
            className="admin-topbar__logo"
            aria-label="Return to admin home"
          >
            <Image
              src={logoSrc}
              alt="Szárnyfeszítő"
              width={48}
              height={48}
              className="admin-topbar__logo-img"
            />
          </Link>
          <nav className="admin-topbar__nav" aria-label="Admin sections">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-nav-link ${isActive(link.href) ? "admin-nav-link--active" : ""}`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {action}
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

export default AdminTopBar;
