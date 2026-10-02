import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BrandMark } from "@/components/BrandMark";
import { PostGrid } from "@/components/PostGrid";
import { useAuthUser } from "@/hooks/useAuthUser";
import { POSTS_PAGE_SIZE, listPosts } from "@/lib/posts.functions";
import { getMyState, toggleLike } from "@/lib/community.functions";

const postsQuery = (limit: number) =>
  queryOptions({
    queryKey: ["posts", "feed", limit],
    queryFn: () => listPosts({ data: { limit } }),
    placeholderData: keepPreviousData,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlushLuxe — roze beauty-community vol inspiratie" },
      {
        name: "description",
        content:
          "Ontdek zachte roze beauty-inspiratie, deel je eigen foto's, geef hartjes en lees reviews met sterren.",
      },
      { property: "og:title", content: "BlushLuxe — roze beauty-community" },
      {
        property: "og:description",
        content: "Deel foto's, geef hartjes en schrijf reviews in een verfijnde roze community.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery(POSTS_PAGE_SIZE)),
  component: Discover,
});

function Discover() {
  // The first screen always comes from the loader-backed query, so the server and
  // the browser render exactly the same list. Extra photos load on the client only.
  const { data: firstPage } = useSuspenseQuery(postsQuery(POSTS_PAGE_SIZE));
  const [limit, setLimit] = useState(POSTS_PAGE_SIZE);
  const more = useQuery({
    ...postsQuery(limit),
    enabled: limit > POSTS_PAGE_SIZE,
  });
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchMyState = useServerFn(getMyState);
  const like = useServerFn(toggleLike);

  const myState = useQuery({
    queryKey: ["my-state", user?.id],
    queryFn: () => fetchMyState(),
    enabled: !!user,
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => like({ data: { postId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-state"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => toast.error("Dat lukte niet, probeer het opnieuw."),
  });

  const list = more.data ?? firstPage;
  const MAX_FEED = 66; // zes pagina's van elf foto's
  const hasMore = list.length >= limit && limit < MAX_FEED;

  return (
    <AppShell>
      <section className="mb-6 rounded-[2rem] border border-border/70 bg-card/80 p-6 text-center shadow-soft">
        <BrandMark size={88} className="mb-3" />
        <h1 className="font-display text-3xl">Zacht, roze en helemaal van jou</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Verzamel je mooiste beautymomenten, geef hartjes aan wat je inspireert en deel je
          eerlijke sterren en reviews.
        </p>
        {!user && (
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90"
          >
            Word lid
          </Link>
        )}
      </section>

      <h2 className="mb-3 font-display text-2xl">Ontdek</h2>
      <PostGrid
        posts={list}
        likedIds={myState.data?.likedPostIds ?? []}
        onToggleLike={(postId) => {
          if (!user) {
            void navigate({ to: "/auth" });
            return;
          }
          likeMutation.mutate(postId);
        }}
        emptyMessage="Nog geen posts. Plaats de eerste foto!"
      />

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={more.isFetching}
            onClick={() => setLimit((current) => Math.min(current + POSTS_PAGE_SIZE, 60))}
            className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {more.isFetching ? "Even geduld..." : "Nog tien foto's"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
