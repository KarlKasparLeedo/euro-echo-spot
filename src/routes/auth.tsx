import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logi sisse | Finantsjälgija" },
      {
        name: "description",
        content: "Logi sisse või loo konto, et jälgida oma kulusid, sissetulekuid ja eelarveid.",
      },
      { property: "og:title", content: "Logi sisse | Finantsjälgija" },
      {
        property: "og:description",
        content: "Logi sisse või loo konto, et jälgida oma kulusid, sissetulekuid ja eelarveid.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Konto loodud. Kinnita e-kiri postkastis.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sisselogimine ebaõnnestus");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Wallet className="h-5 w-5 text-primary" />
          Finantsjälgija
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Logi sisse" : "Loo konto"}</CardTitle>
            <CardDescription>Sinu andmed on privaatsed ja nähtavad ainult sulle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sisselogimine</TabsTrigger>
                <TabsTrigger value="signup">Registreerimine</TabsTrigger>
              </TabsList>
            </Tabs>

            {sent ? (
              <p className="text-sm text-muted-foreground">
                Saatsime kinnituskirja aadressile {email}. Kinnita see ja logi seejärel sisse.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">E-post</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Parool</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {mode === "signin" ? "Logi sisse" : "Registreeru"}
                </Button>
              </form>
            )}

            <div className="relative py-1 text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">või</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 border-t" />
            </div>

            <Button variant="outline" className="w-full" onClick={googleSignIn}>
              Jätka Google&apos;iga
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
