import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PostGrid } from "@/components/PostGrid";
import { useAuthUser } from "@/hooks/useAuthUser";
import { searchPosts } from "@/lib/posts.functions";
import { getMyState, toggleLike } from "@/lib/community.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Zoeken — BlushLuxe" },
      {
        name: "description",
        content: "Zoek in BlushLuxe op titel, omschrijving of tags en vind je roze inspiratie.",
      },
      { property: "og:title", content: "Zoeken in BlushLuxe" },
      {
        property: "og:description",
        content: "Vind beautyfoto's op titel, omschrijving of tag.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runSearch = useServerFn(searchPosts);
  const fetchMyState = useServerFn(getMyState);
  const like = useServerFn(toggleLike);

  const results = useQuery({
    queryKey: ["search", term],
    queryFn: () => runSearch({ data: { q: term } }),
  });

  const myState = useQuery({
    queryKey: ["my-state", user?.id],
    queryFn: () => fetchMyState(),
    enabled: !!user,
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => like({ data: { postId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-state"] });
      void queryClient.invalidateQueries({ queryKey: ["search"] });
    },
    onError: () => toast.error("Dat lukte niet, probeer het opnieuw."),
  });

  return (
    <AppShell>
      <h1 className="mb-4 font-display text-3xl">Zoeken</h1>
      <label className="mb-6 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
        <SearchIcon size={18} className="text-primary" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Zoek op titel, omschrijving of tag"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      <PostGrid
        posts={results.data ?? []}
        likedIds={myState.data?.likedPostIds ?? []}
        onToggleLike={(postId) => {
          if (!user) {
            void navigate({ to: "/auth" });
            return;
          }
          likeMutation.mutate(postId);
        }}
        emptyMessage={
          results.isLoading ? "Even zoeken…" : "Niets gevonden. Probeer een ander woord."
        }
      />
    </AppShell>
  );
}
