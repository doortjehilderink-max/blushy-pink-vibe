import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Stars, StarInput } from "@/components/Stars";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getPostDetail } from "@/lib/posts.functions";
import { deleteReview, getMyState, saveReview, toggleLike } from "@/lib/community.functions";
import { cn } from "@/lib/utils";

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["post", id],
    queryFn: () => getPostDetail({ data: { id } }),
  });

export const Route = createFileRoute("/post/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailQuery(params.id)),
  head: ({ loaderData }) => {
    const title = loaderData?.post.title ?? "Post";
    return {
      meta: [
        { title: `${title} — BlushLuxe` },
        {
          name: "description",
          content:
            loaderData?.post.description ??
            "Bekijk deze roze beauty-inspiratie op BlushLuxe, met hartjes en reviews.",
        },
        { property: "og:title", content: `${title} — BlushLuxe` },
        {
          property: "og:description",
          content: loaderData?.post.description ?? "Roze beauty-inspiratie op BlushLuxe.",
        },
      ],
    };
  },
  component: PostDetail,
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Deze post kon niet geladen worden.</p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Deze post bestaat niet meer.</p>
    </AppShell>
  ),
});

function PostDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(detailQuery(id));
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchMyState = useServerFn(getMyState);
  const like = useServerFn(toggleLike);
  const submitReview = useServerFn(saveReview);
  const removeReview = useServerFn(deleteReview);

  const myState = useQuery({
    queryKey: ["my-state", user?.id],
    queryFn: () => fetchMyState(),
    enabled: !!user,
  });

  const myReview = myState.data?.reviews.find((r) => r.postId === id);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setBody(myReview.body ?? "");
    }
  }, [myReview?.rating, myReview?.body]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["post", id] });
    void queryClient.invalidateQueries({ queryKey: ["my-state"] });
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const likeMutation = useMutation({
    mutationFn: () => like({ data: { postId: id } }),
    onSuccess: invalidate,
    onError: () => toast.error("Dat lukte niet."),
  });

  const reviewMutation = useMutation({
    mutationFn: () => submitReview({ data: { postId: id, rating, body } }),
    onSuccess: () => {
      invalidate();
      toast.success("Je review is opgeslagen.");
    },
    onError: () => toast.error("Kies eerst een aantal sterren."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeReview({ data: { postId: id } }),
    onSuccess: () => {
      setRating(0);
      setBody("");
      invalidate();
      toast.success("Je review is verwijderd.");
    },
  });

  if (!data) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Deze post bestaat niet meer.</p>
      </AppShell>
    );
  }

  const { post, reviews } = data;
  const liked = myState.data?.likedPostIds.includes(id) ?? false;

  return (
    <AppShell>
      <article className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-soft">
        <img src={post.imageUrl} alt={post.title} className="w-full object-cover" />
        <div className="space-y-3 p-5">
          <h1 className="font-display text-3xl leading-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">door {post.authorName}</p>
          {post.description && <p className="text-sm leading-relaxed">{post.description}</p>}
          {post.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => (user ? likeMutation.mutate() : void navigate({ to: "/auth" }))}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
            >
              <Heart
                size={18}
                className={cn(liked ? "fill-primary text-primary" : "text-primary/70")}
              />
              {post.likeCount}
            </button>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Stars value={post.averageRating ?? 0} size={16} />
              {post.averageRating !== null
                ? `${post.averageRating.toFixed(1)} · ${post.reviewCount} review${post.reviewCount === 1 ? "" : "s"}`
                : "Nog geen reviews"}
            </span>
          </div>
        </div>
      </article>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-2xl">Sterren &amp; reviews</h2>

        {user ? (
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
            <StarInput value={rating} onChange={setRating} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Wat vind je ervan?"
              className="mt-3 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={rating < 1 || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {myReview ? "Review bijwerken" : "Review plaatsen"}
              </button>
              {myReview && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <Trash2 size={15} /> Verwijderen
                </button>
              )}
            </div>
          </div>
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-center rounded-3xl border border-dashed border-primary/40 bg-card/70 px-6 py-6 text-sm text-primary"
          >
            Log in om sterren en een review achter te laten
          </Link>
        )}

        <ul className="mt-4 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-3xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{review.authorName}</span>
                <Stars value={review.rating} />
              </div>
              {review.body && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{review.body}</p>
              )}
            </li>
          ))}
          {reviews.length === 0 && (
            <li className="text-sm text-muted-foreground">Nog geen reviews. Wees de eerste.</li>
          )}
        </ul>
      </section>
    </AppShell>
  );
}
