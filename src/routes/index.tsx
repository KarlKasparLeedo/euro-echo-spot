import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wallet, PieChart, Target, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finantsjälgija – hoia oma rahaasjad kontrolli all" },
      {
        name: "description",
        content:
          "Jälgi kulusid ja sissetulekuid, sea kategooriapõhiseid eelarveid ning näe selget ülevaadet oma rahaasjadest.",
      },
      { property: "og:title", content: "Finantsjälgija – hoia oma rahaasjad kontrolli all" },
      {
        property: "og:description",
        content:
          "Jälgi kulusid ja sissetulekuid, sea kategooriapõhiseid eelarveid ning näe selget ülevaadet oma rahaasjadest.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: PieChart, title: "Selge ülevaade", text: "Bilanss, kuu kulud ja kategooriate jaotus graafikutel." },
  { icon: Wallet, title: "Kiire sisestus", text: "Lisa tehing paari klõpsuga, kategooria pakutakse automaatselt." },
  { icon: Target, title: "Eelarved ja eesmärgid", text: "Kuulimiidid koos hoiatustega ning säästueesmärkide progress." },
  { icon: ShieldCheck, title: "Privaatne", text: "Sinu andmed on seotud sinu kontoga ja nähtavad ainult sulle." },
];

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <span className="flex items-center gap-2 font-semibold">
          <Wallet className="h-5 w-5 text-primary" />
          Finantsjälgija
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Logi sisse</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="py-14 text-center md:py-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Hoia oma rahaasjad kontrolli all
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Sisesta kulud ja sissetulekud, sea kategooriapõhised eelarved ning näe kohe, kas raha jätkub
            kuu lõpuni.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Alusta tasuta</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-medium">{f.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
