import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PostGrid } from "@/components/PostGrid";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getUserProfile } from "@/lib/posts.functions";
import { getMyState, toggleFollow, toggleLike } from "@/lib/community.functions";

const profileQuery = (id: string) =>
  queryOptions({
    queryKey: ["user-profile", id],
    queryFn: () => getUserProfile({ data: { id } }),
  });

export const Route = createFileRoute("/user/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(profileQuery(params.id)),
  head: ({ loaderData }) => {
    const name = loaderData?.displayName ?? "Lid";
    return {
      meta: [
        { title: `${name} — BlushLuxe` },
        {
          name: "description",
          content: `Bekijk de roze beauty-posts van ${name} en volg dit BlushLuxe lid.`,
        },
        { property: "og:title", content: `${name} op BlushLuxe` },
        { property: "og:description", content: `De posts en hartjes van ${name}.` },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: UserProfilePage,
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Dit profiel kon niet geladen worden.</p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Dit profiel bestaat niet.</p>
    </AppShell>
  ),
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(profileQuery(id));
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchMyState = useServerFn(getMyState);
  const follow = useServerFn(toggleFollow);
  const like = useServerFn(toggleLike);

  const myState = useQuery({
    queryKey: ["my-state", user?.id],
    queryFn: () => fetchMyState(),
    enabled: !!user,
  });

  const isFollowing = myState.data?.followingIds?.includes(id) ?? false;

  const followMutation = useMutation({
    mutationFn: () => follow({ data: { userId: id } }),
    onSuccess: () => void queryClient.invalidateQueries(),
    onError: () => toast.error("Volgen lukte niet."),
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => like({ data: { postId } }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  if (!data) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Dit profiel bestaat niet.</p>
      </AppShell>
    );
  }

  const isMe = user?.id === data.id;

  return (
    <AppShell>
      <section className="rounded-3xl border border-border/70 bg-card p-6 text-center shadow-soft">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-2xl text-secondary-foreground">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={data.displayName} className="h-full w-full object-cover" />
          ) : (
            data.displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <h1 className="font-display text-3xl">{data.displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.followerCount} volger{data.followerCount === 1 ? "" : "s"} · {data.followingCount} volgend ·{" "}
          {data.posts.length} post{data.posts.length === 1 ? "" : "s"}
        </p>
        {isMe ? (
          <Link
            to="/profile"
            className="mt-4 inline-block rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            Mijn profiel beheren
          </Link>
        ) : (
          <button
            type="button"
            disabled={followMutation.isPending}
            onClick={() => (user ? followMutation.mutate() : void navigate({ to: "/auth" }))}
            className={
              isFollowing
                ? "mt-4 rounded-full border border-border px-6 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                : "mt-4 rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90"
            }
          >
            {isFollowing ? "Ontvolgen" : "Volgen"}
          </button>
        )}
      </section>

      <h2 className="mb-3 mt-6 font-display text-2xl">Posts</h2>
      <PostGrid
        posts={data.posts}
        likedIds={myState.data?.likedPostIds ?? []}
        onToggleLike={(postId) =>
          user ? likeMutation.mutate(postId) : void navigate({ to: "/auth" })
        }
        emptyMessage="Dit lid heeft nog niets geplaatst."
      />
    </AppShell>
  );
}
