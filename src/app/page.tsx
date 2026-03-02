import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white to-zinc-100 px-6 py-12">
      <section className="flex w-full max-w-4xl flex-col gap-8 rounded-3xl border border-white/40 bg-white/90 p-10 shadow-2xl shadow-black/5 backdrop-blur">
        <header>
          <p className="text-xs uppercase tracking-[0.6em] text-zinc-500">
            Szarnyfeszito Admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-zinc-900">
            Birds, text, and imagery crafted with AI, guarded by a single admin.
          </h1>
          <p className="mt-3 text-lg text-zinc-600">
            This repo hosts the closed Admin/Keltető MVP. The admin flow starts with
            a secured Supabase login before the dashboard and content pipelines become visible.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black"
            href="/admin/login"
          >
            Open admin login
          </Link>
          <p className="text-sm text-zinc-500">
            Login requires the allow-listed email configured via <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_EMAIL</code> and the matching Supabase password.
          </p>
        </div>
      </section>
    </main>
  );
}
