import AdminLoginForm from "@/components/AdminLoginForm";
import { ADMIN_EMAIL } from "@/lib/config";
import { getAdminUserFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";

const adminEmail = ADMIN_EMAIL;

export const metadata = {
  title: "Admin login — Szarnyfeszito",
};

export default async function AdminLoginPage() {
  const existingUser = await getAdminUserFromCookies();
  if (existingUser) {
    redirect("/admin");
  }

  if (!adminEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-white/10 bg-zinc-900/80 p-10 text-center shadow-2xl shadow-black/60">
          <h1 className="text-2xl font-semibold text-white">Missing ADMIN_EMAIL</h1>
          <p className="text-sm text-zinc-400">
            Define <code className="rounded bg-white/10 px-2 text-xs">ADMIN_EMAIL</code> in your environment so the login form can render.
          </p>
        </section>
      </main>
    );
  }

  const allowedEmail = adminEmail;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-10 shadow-2xl shadow-black/60">
        <header className="space-y-3 text-center text-white">
          <p className="text-sm uppercase tracking-[0.4em] text-zinc-500">
            Szarnyfeszito
          </p>
          <h1 className="text-3xl font-semibold">Admin authentication</h1>
          <p className="text-sm text-zinc-400">
            Only the allow-listed admin email can sign in. Once authenticated, you
            can reach the protected dashboard.
          </p>
        </header>

        <AdminLoginForm allowedEmail={allowedEmail} />
      </section>
    </main>
  );
}

