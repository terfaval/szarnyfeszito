import AdminLoginForm from "@/components/AdminLoginForm";
import { ADMIN_EMAIL } from "@/lib/config";
import { getAdminUserFromCookies } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sanitizeRedirectTarget } from "@/lib/redirect";

const adminEmail = ADMIN_EMAIL;

export const metadata = {
  title: "Admin login — Szarnyfeszito",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const existingUser = await getAdminUserFromCookies();
  if (existingUser) {
    redirect("/admin");
  }

  if (!adminEmail) {
    return (
      <main className="admin-shell-canvas page-backdrop">
        <div className="admin-shell">
          <section className="admin-shell__panel">
            <header className="admin-heading">
              <p className="admin-heading__label">Admin login</p>
              <h1 className="admin-heading__title admin-heading__title--large">
                Missing ADMIN_EMAIL
              </h1>
              <p className="admin-heading__description">
                Define <code className="admin-inline-code">ADMIN_EMAIL</code> in your environment so the login form can
                render.
              </p>
            </header>
          </section>
        </div>
      </main>
    );
  }

  const allowedEmail = adminEmail;

  return (
    <main className="admin-shell-canvas page-backdrop">
      <div className="admin-shell">
        <section className="admin-shell__panel stack">
          <header className="admin-heading">
            <p className="admin-heading__label">Szárnyfeszítő</p>
            <h1 className="admin-heading__title admin-heading__title--large">
              Admin authentication
            </h1>
            <p className="admin-heading__description">
              Only the allow-listed admin email can sign in. Once authenticated,
              you can reach the dashboard.
            </p>
          </header>

          <AdminLoginForm
            allowedEmail={allowedEmail}
            redirectTo={sanitizeRedirectTarget(searchParams?.redirect ?? null)}
          />
        </section>
      </div>
    </main>
  );
}

