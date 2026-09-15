import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { listMembers } from "@/lib/community.functions";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [
      { title: "Leden — BlushLuxe" },
      {
        name: "description",
        content: "Ontdek andere BlushLuxe-leden en volg wie je inspireert.",
      },
      { property: "og:title", content: "Leden op BlushLuxe" },
      {
        property: "og:description",
        content: "Ontdek en volg andere leden in de roze community.",
      },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const fetchMembers = useServerFn(listMembers);
  const members = useQuery({
    queryKey: ["members"],
    queryFn: () => fetchMembers(),
  });

  return (
    <AppShell>
      <h1 className="mb-1 font-display text-3xl">Leden</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ontdek wie er actief is en volg je favoriete accounts.
      </p>

      {(members.data?.length ?? 0) === 0 ? (
        <p className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
          Er zijn nog geen leden om te volgen.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.data?.map((member) => (
            <li key={member.id}>
              <Link
                to="/user/$id"
                params={{ id: member.id }}
                className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm transition-colors hover:bg-secondary"
              >
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-lg text-secondary-foreground">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    member.displayName.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="truncate font-medium">{member.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
