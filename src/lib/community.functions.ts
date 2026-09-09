import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signImageUrls, type PostCard } from "./posts.functions";

export const getMyState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: likes }, { data: reviews }, { data: profile }] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", userId),
      supabase.from("reviews").select("post_id,rating,body").eq("user_id", userId),
      supabase.from("profiles").select("display_name,avatar_url").eq("id", userId).maybeSingle(),
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
