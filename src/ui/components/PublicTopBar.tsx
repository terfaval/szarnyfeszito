"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

const NAV_LINKS = [
  { label: "Madarak", href: "/birds" },
  { label: "Helyszínek", href: "/places/list" },
];

export function PublicTopBar() {
  const pathname = usePathname() ?? "";
  const isDashboard = pathname === "/public";
  const navId = useId();
  const [menuOpenForPath, setMenuOpenForPath] = useState<string | null>(null);
  const menuOpen = menuOpenForPath === pathname;

  const isActive = (href: string) => {
    if (href === "/birds") {
      return pathname === "/birds" || pathname.startsWith("/birds/");
    }
    if (href === "/places/list") {
      return pathname === "/places" || pathname.startsWith("/places/");
    }
    return pathname === href;
  };

  return (
    <div className={`admin-topbar ${isDashboard ? "admin-topbar--dashboard-overlay" : ""}`}>
      <div className="admin-topbar__inner">
        <div className="admin-topbar__brand">
          <Link href="/public" className="admin-topbar__logo" aria-label="Vissza a publikus áttekintőre">
            <Image src="/logo.svg" alt="Szárnyfeszítő" width={48} height={48} className="admin-topbar__logo-img" />
          </Link>
          <button
            type="button"
            className="admin-topbar__menu-button"
            aria-expanded={menuOpen}
            aria-controls={navId}
            onClick={() => setMenuOpenForPath((current) => (current === pathname ? null : pathname))}
          >
            Menü
          </button>
          <nav
            id={navId}
            className={`admin-topbar__nav ${menuOpen ? "admin-topbar__nav--open" : ""}`}
            aria-label="Publikus szekciók"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-nav-link ${isActive(link.href) ? "admin-nav-link--active" : ""}`}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={() => setMenuOpenForPath(null)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default PublicTopBar;
