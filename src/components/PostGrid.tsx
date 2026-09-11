import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Stars } from "@/components/Stars";
import { cn } from "@/lib/utils";
import type { PostCard } from "@/lib/posts.functions";

export function PostGrid({
  posts,
  likedIds,
  onToggleLike,
  emptyMessage = "Nog niets te zien hier.",
}: {
  posts: PostCard[];
  likedIds?: string[];
  onToggleLike?: (postId: string) => void;
  emptyMessage?: string;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
      {posts.map((post) => {
        const liked = likedIds?.includes(post.id) ?? false;
        return (
          <article
            key={post.id}
            className="break-inside-avoid overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition-shadow hover:shadow-blush"
          >
            <Link to="/post/$id" params={{ id: post.id }} className="block">
              <img
                src={post.imageUrl}
                alt={post.title}
                loading="lazy"
                className="w-full object-cover"
              />
            </Link>
            <div className="space-y-2 p-3">
              <Link to="/post/$id" params={{ id: post.id }}>
                <h3 className="font-display text-lg leading-tight">{post.title}</h3>
              </Link>
              {post.authorId ? (
                <Link
                  to="/user/$id"
                  params={{ id: post.authorId }}
                  className="block text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  {post.authorName}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">{post.authorName}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {post.averageRating !== null ? (
                    <>
                      <Stars value={post.averageRating} />
                      <span>{post.averageRating.toFixed(1)}</span>
                    </>
                  ) : (
                    <span>Nog geen reviews</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleLike?.(post.id)}
                  aria-label={liked ? "Hartje weghalen" : "Hartje geven"}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <Heart
                    size={16}
                    className={cn(liked ? "fill-primary text-primary" : "text-primary/60")}
                  />
                  {post.likeCount}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
