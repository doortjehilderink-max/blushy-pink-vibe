import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { createPost } from "@/lib/community.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Foto plaatsen — BlushLuxe" },
      {
        name: "description",
        content: "Deel je eigen beautyfoto met titel, omschrijving en tags op BlushLuxe.",
      },
      { property: "og:title", content: "Foto plaatsen op BlushLuxe" },
      { property: "og:description", content: "Deel je beautymoment met de community." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submit = useServerFn(createPost);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  function pickFile(selected: File | null) {
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Kies eerst een foto.");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Log opnieuw in.");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const result = await submit({
        data: {
          imagePath: path,
          title,
          description,
          tags: tags
            .split(/[,\s]+/)
            .map((t) => t.replace(/^#/, ""))
            .filter(Boolean),
        },
      });

      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Je post staat online!");
      void navigate({ to: "/post/$id", params: { id: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Uploaden lukte niet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-4 font-display text-3xl">Nieuwe post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[2rem] border border-dashed border-primary/40 bg-card/70 px-6 py-10 text-center text-sm text-muted-foreground">
          {preview ? (
            <img
              src={preview}
              alt="Voorbeeld van je gekozen foto"
              className="max-h-72 w-full rounded-2xl object-cover"
            />
          ) : (
            <>
              <ImagePlus className="text-primary" />
              Kies een foto van je toestel
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Omschrijving"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, gescheiden door komma's (blush, glow, roze)"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Bezig met plaatsen…" : "Plaatsen"}
        </button>
      </form>
    </AppShell>
  );
}
