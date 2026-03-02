"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import LogoutButton from "@/components/LogoutButton";

export type AdminTopBarProps = {
  breadcrumb?: ReactNode;
  action?: ReactNode;
};

export function AdminTopBar({ breadcrumb, action }: AdminTopBarProps) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-transparent bg-zinc-900/70 transition hover:border-white/30"
          >
            <Image
              src="/logo.svg"
              alt="Szárnyfeszítő"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </Link>
          {breadcrumb}
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
