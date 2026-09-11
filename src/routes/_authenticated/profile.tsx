import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PostGrid } from "@/components/PostGrid";
import { supabase } from "@/integrations/supabase/client";
import {
  deletePost,
  getMyState,
  listMyFollowing,
  listMyLikedPosts,
  listMyPosts,
  toggleLike,
  updateProfile,
} from "@/lib/community.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Mijn profiel — BlushLuxe" },
      {
        name: "description",
        content: "Beheer je naam, bekijk je eigen posts en log uit bij BlushLuxe.",
      },
      { property: "og:title", content: "Mijn profiel op BlushLuxe" },
      { property: "og:description", content: "Je naam, je posts en je account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchMyState = useServerFn(getMyState);
  const fetchMyPosts = useServerFn(listMyPosts);
  const saveProfile = useServerFn(updateProfile);
  const removePost = useServerFn(deletePost);
  const fetchLiked = useServerFn(listMyLikedPosts);
  const fetchFollowing = useServerFn(listMyFollowing);
  const like = useServerFn(toggleLike);

  const myState = useQuery({ queryKey: ["my-state"], queryFn: () => fetchMyState() });
  const myPosts = useQuery({ queryKey: ["my-posts"], queryFn: () => fetchMyPosts() });
  const likedPosts = useQuery({ queryKey: ["my-liked"], queryFn: () => fetchLiked() });
  const followingList = useQuery({ queryKey: ["my-following"], queryFn: () => fetchFollowing() });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => like({ data: { postId } }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  const [name, setName] = useState("");
  useEffect(() => {
    if (myState.data?.displayName) setName(myState.data.displayName);
  }, [myState.data?.displayName]);

  const nameMutation = useMutation({
    mutationFn: () => saveProfile({ data: { displayName: name } }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Naam bijgewerkt.");
    },
    onError: () => toast.error("Naam opslaan lukte niet."),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => removePost({ data: { postId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Post verwijderd.");
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <h1 className="mb-4 font-display text-3xl">Mijn profiel</h1>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Weergavenaam
        </label>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="button"
            onClick={() => nameMutation.mutate()}
            className="shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90"
          >
            Opslaan
          </button>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full rounded-full border border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          Uitloggen
        </button>
      </section>

      <h2 className="mb-3 mt-6 font-display text-2xl">Mijn posts</h2>
      <PostGrid posts={myPosts.data ?? []} emptyMessage="Je hebt nog niets geplaatst." />

      {(myPosts.data?.length ?? 0) > 0 && (
        <ul className="mt-4 space-y-2">
          {myPosts.data?.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm"
            >
              <span className="truncate">{post.title}</span>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(post.id)}
                aria-label={`${post.title} verwijderen`}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 size={16} /> Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
