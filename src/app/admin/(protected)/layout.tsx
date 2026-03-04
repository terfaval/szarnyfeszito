import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminUserFromCookies } from "@/lib/auth";
import { AdminShell } from "@/ui/components/AdminShell";

export const metadata = {
  title: "Szárnyfeszítő admin dashboard",
};

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
