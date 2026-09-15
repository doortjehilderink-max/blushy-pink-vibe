import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PostCard = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  authorName: string;
  authorId: string | null;
  imageUrl: string;
  likeCount: number;
  reviewCount: number;
  averageRating: number | null;
  createdAt: string;
};

export type PostReview = {
  id: string;
  userId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  authorName: string;
  avatarUrl: string | null;
};

export type PostRow = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  author_name: string;
  user_id: string | null;
  image_url: string;
  created_at: string;
  likes: { count: number }[] | null;
  reviews: { rating: number }[] | null;
};

export const POST_SELECT =
  "id,title,description,tags,author_name,user_id,image_url,created_at,likes(count),reviews(rating)";

function publicClient(): SupabaseClient<Database> {
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

// Images are served from our own origin (/api/public/img/<path>) so they never
// expire and are not blocked by networks that block the storage domain.
export async function signImageUrls(
  _client: SupabaseClient<Database>,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const p of paths) {
    if (!p || p.startsWith("http")) continue;
    map.set(p, `/api/public/img/${p.split("/").map(encodeURIComponent).join("/")}`);
  }
  return map;
}

export async function toCards(
  client: SupabaseClient<Database>,
  rows: PostRow[] | null,
): Promise<PostCard[]> {
  if (!rows || rows.length === 0) return [];
  const signed = await signImageUrls(
    client,
    rows.map((r) => r.image_url),
  );
  return rows.map((row) => {
    const ratings = (row.reviews ?? []).map((r) => r.rating);
    const average =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      tags: row.tags ?? [],
      authorName: row.author_name,
      authorId: row.user_id,
      imageUrl: signed.get(row.image_url) ?? row.image_url,
      likeCount: row.likes?.[0]?.count ?? 0,
      reviewCount: ratings.length,
      averageRating: average,
      createdAt: row.created_at,
    };
  });
}

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const { data, error } = await client
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return toCards(client, data as unknown as PostRow[]);
});

export const searchPosts = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => ({ q: String(input?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    const term = data.q.trim();
    const client = publicClient();
    let query = client.from("posts").select(POST_SELECT);
    if (term.length > 0) {
      const escaped = term.replace(/[%,()]/g, " ");
      query = query.or(
        `title.ilike.%${escaped}%,description.ilike.%${escaped}%,tags.cs.{${escaped}}`,
      );
    }
    const { data: rows, error } = await query
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return toCards(client, rows as unknown as PostRow[]);
  });

export const getPostDetail = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }) => {
    const client = publicClient();
    const { data: row, error } = await client
      .from("posts")
      .select(POST_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [card] = await toCards(client, [row as unknown as PostRow]);

    const { data: reviewRows } = await client
      .from("reviews")
      .select("id,user_id,rating,body,created_at")
      .eq("post_id", data.id)
      .order("created_at", { ascending: false });

    const userIds = [...new Set((reviewRows ?? []).map((r) => r.user_id))];
    const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
      }
    }

    const reviews: PostReview[] = (reviewRows ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
      authorName: profileMap.get(r.user_id)?.display_name ?? "BlushLuxe lid",
      avatarUrl: profileMap.get(r.user_id)?.avatar_url ?? null,
    }));

    return { post: card!, reviews };
  });

export const getUserProfile = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }) => {
    const client = publicClient();
    const [{ data: profile }, { data: rows }, { count: followers }, { count: following }] =
      await Promise.all([
        client
          .from("profiles")
          .select("id,display_name,avatar_url,created_at")
          .eq("id", data.id)
          .maybeSingle(),
        client
          .from("posts")
          .select(POST_SELECT)
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })
          .limit(60),
        client
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", data.id),
        client
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", data.id),
      ]);
    if (!profile) return null;
    const posts = await toCards(client, rows as unknown as PostRow[]);
    return {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      followerCount: followers ?? 0,
      followingCount: following ?? 0,
      posts,
    };
  });
