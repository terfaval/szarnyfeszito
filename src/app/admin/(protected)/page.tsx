import Link from "next/link";
import { listBirds } from "@/lib/birdService";
import { BirdStatus, BIRD_STATUS_VALUES } from "@/types/bird";
import { Card } from "@/ui/components/Card";
import { StatusPill } from "@/ui/components/StatusPill";

export const metadata = {
  title: "Dashboard â€” Szarnyfeszito Admin",
};

export default async function AdminPage() {
  const birds = await listBirds();

  const statusCounts = birds.reduce(
    (acc, bird) => {
      acc[bird.status] = (acc[bird.status] ?? 0) + 1;
      return acc;
    },
    BIRD_STATUS_VALUES.reduce<Record<BirdStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<BirdStatus, number>)
  );

  const recentBirds = birds.slice(0, 3);

  return (
    <section className="space-y-8">
      <Card className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Bird pipeline overview
          </h1>
          <p className="text-sm text-zinc-400">
            Track the Szarnyfeszito pipeline from draft text to publish-ready
            stories. Navigate to Birds to continue the flow.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {BIRD_STATUS_VALUES.map((status) => (
            <article
              key={status}
              className="rounded-[14px] border border-white/10 bg-zinc-900/60 p-4"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                {status}
              </p>
              <p className="text-3xl font-semibold text-white">
                {statusCounts[status] ?? 0}
              </p>
              <p className="text-xs text-zinc-500">
                {status === "draft"
                  ? "New birds awaiting text"
                  : status === "text_generated"
                  ? "Text generated"
                  : status === "text_approved"
                  ? "Text approved"
                  : status === "images_generated"
                  ? "Images in progress"
                  : status === "images_approved"
                  ? "Images approved"
                  : "Published"}
              </p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            className="rounded-[14px] border border-white/10 bg-white/10 p-4 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white"
            href="/admin/birds"
          >
            Manage Birds
            <span className="mt-2 block text-xs text-zinc-300">
              Explore list, editors, and pipeline states.
            </span>
          </Link>

          <article className="rounded-[14px] border border-dashed border-zinc-800/60 p-4 text-sm text-zinc-400">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Places
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">0</p>
            <p className="text-xs text-zinc-500">
              CRUD coming soon (see T101).
            </p>
          </article>

          <article className="rounded-[14px] border border-dashed border-zinc-800/60 p-4 text-sm text-zinc-400">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Phenomena
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">0</p>
            <p className="text-xs text-zinc-500">
              Pending T102/T105 work.
            </p>
          </article>
        </div>
      </Card>

      <Card className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
              Birds
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Recent birds in the pipeline
            </h2>
          </div>
          <Link
            className="rounded-full border border-zinc-700 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:border-white"
            href="/admin/birds"
          >
            View all birds
          </Link>
        </header>

        <div className="space-y-3">
          {recentBirds.length === 0 && (
            <p className="text-sm text-zinc-400">
              No birds have been created yet. Use the Birds page to add the
              first entry.
            </p>
          )}

          {recentBirds.map((bird) => (
            <Link
              key={bird.id}
              href={`/admin/birds/${bird.id}`}
              className="group flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-white/5 bg-white/5 p-4 text-left no-underline transition hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
            >
              <div>
                <p className="text-lg font-semibold text-white">{bird.name_hu}</p>
                <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">
                  {bird.slug}
                </p>
                <StatusPill status={bird.status} />
              </div>
              <div className="text-right text-xs text-zinc-400">
                <p>
                  Updated{" "}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(bird.updated_at))}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-zinc-600 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white transition">
                  Open editor
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </section>
  );
}
