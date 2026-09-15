import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { POST_SELECT, signImageUrls, toCards, type PostCard, type PostRow } from "./posts.functions";

export const getMyState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [
      { data: likes },
      { data: reviews },
      { data: profile },
      { data: following },
      { count: followerCount },
    ] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", userId),
      supabase.from("reviews").select("post_id,rating,body").eq("user_id", userId),
      supabase.from("profiles").select("display_name,avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("follows").select("following_id").eq("follower_id", userId),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", userId),
    ]);
    return {
      userId,
      likedPostIds: (likes ?? []).map((l) => l.post_id),
      reviews: (reviews ?? []).map((r) => ({
        postId: r.post_id,
        rating: r.rating,
        body: r.body,
      })),
      displayName: profile?.display_name ?? "BlushLuxe lid",
      avatarUrl: profile?.avatar_url ?? null,
      followingIds: (following ?? []).map((f) => f.following_id),
      followerCount: followerCount ?? 0,
    };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string }) => ({ postId: String(input.postId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("likes").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { liked: false };
    }
    const { error } = await supabase
      .from("likes")
      .insert({ post_id: data.postId, user_id: userId });
    if (error) throw new Error(error.message);
    return { liked: true };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    imagePath: string;
    title: string;
    description: string;
    tags: string[];
  }) => ({
    imagePath: String(input.imagePath),
    title: String(input.title).trim().slice(0, 120),
    description: String(input.description ?? "").trim().slice(0, 1000),
    tags: (input.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 8),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.title) throw new Error("Geef je post een titel.");
    if (!data.imagePath.startsWith(`${userId}/`)) throw new Error("Ongeldige foto.");
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const { data: inserted, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        author_name: profile?.display_name ?? "BlushLuxe lid",
        image_url: data.imagePath,
        title: data.title,
        description: data.description || null,
        tags: data.tags,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string }) => ({ postId: String(input.postId) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .delete()
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; rating: number; body: string }) => ({
    postId: String(input.postId),
    rating: Math.min(5, Math.max(1, Math.round(Number(input.rating)))),
    body: String(input.body ?? "").trim().slice(0, 800),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").upsert(
      {
        post_id: data.postId,
        user_id: context.userId,
        rating: data.rating,
        body: data.body || null,
      },
      { onConflict: "post_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string }) => ({ postId: String(input.postId) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reviews")
      .delete()
      .eq("post_id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string; avatarUrl?: string | null }) => ({
    displayName: String(input.displayName).trim().slice(0, 60),
    avatarUrl: input.avatarUrl ? String(input.avatarUrl) : null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.displayName) throw new Error("Vul een naam in.");
    const { error } = await context.supabase
      .from("profiles")
      .upsert({
        id: context.userId,
        display_name: data.displayName,
        avatar_url: data.avatarUrl,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("posts")
      .update({ author_name: data.displayName })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const listMyPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,description,tags,author_name,user_id,image_url,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const signed = await signImageUrls(
      supabase,
      (data ?? []).map((r) => r.image_url),
    );
    const cards: PostCard[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tags: row.tags ?? [],
      authorName: row.author_name,
      authorId: row.user_id,
      imageUrl: signed.get(row.image_url) ?? row.image_url,
      likeCount: 0,
      reviewCount: 0,
      averageRating: null,
      createdAt: row.created_at,
    }));
    return cards;
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.userId === userId) throw new Error("Je kunt jezelf niet volgen.");
    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", data.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { following: false };
    }
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: userId, following_id: data.userId });
    if (error) throw new Error(error.message);
    return { following: true };
  });

export const listMyLikedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const ids = (likes ?? []).map((l) => l.post_id);
    if (ids.length === 0) return [] as PostCard[];
    const { data: rows, error } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
    if (error) throw new Error(error.message);
    const cards = await toCards(supabase, rows as unknown as PostRow[]);
    const order = new Map(ids.map((id, i) => [id, i]));
    return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  });

export const listMyFollowing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    const ids = (rows ?? []).map((r) => r.following_id);
    if (ids.length === 0) return [] as { id: string; displayName: string; avatarUrl: string | null }[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", ids);
    return (profiles ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    }));
  });

export const listMembers = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const { data: profiles, error } = await client
    .from("profiles")
    .select("id,display_name,avatar_url,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (profiles ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
  }));
});

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
