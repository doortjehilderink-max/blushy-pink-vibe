import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Inloggen of registreren — BlushLuxe" },
      {
        name: "description",
        content:
          "Maak een BlushLuxe-account aan of log in om foto's te plaatsen, hartjes te geven en reviews te schrijven.",
      },
      { property: "og:title", content: "Word lid van BlushLuxe" },
      {
        property: "og:description",
        content: "Log in om te plaatsen, hartjes te geven en sterren te delen.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Bijna klaar! Bevestig je e-mail via de link die we stuurden.");
          return;
        }
        toast.success("Welkom bij BlushLuxe!");
        void navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Fijn dat je er weer bent.");
        void navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Inloggen met Google lukte niet.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <BrandMark size={104} className="mb-4" />
        <h1 className="font-display text-4xl">BlushLuxe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Jouw zachte, roze plek voor beauty-inspiratie.
        </p>
      </div>

      <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-blush">
        <div className="mb-5 grid grid-cols-2 rounded-full bg-secondary p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-full py-2 transition-colors ${mode === "login" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
          >
            Inloggen
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full py-2 transition-colors ${mode === "signup" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}
          >
            Registreren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Je naam"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mailadres"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground shadow-blush transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mode === "signup" ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> of <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full rounded-full border border-border bg-background py-3 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          Doorgaan met Google
        </button>
      </div>

      <Link to="/" className="mt-6 text-center text-sm text-muted-foreground hover:text-primary">
        Verder kijken zonder account
      </Link>
    </div>
  );
}
