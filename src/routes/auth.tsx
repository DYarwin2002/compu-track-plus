import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { logAudit } from "@/lib/audit.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — ServiCompu Yarango" },
      { name: "description", content: "Acceso al sistema interno de ServiCompu Yarango." },
      { property: "og:title", content: "Ingresar — ServiCompu Yarango" },
      { property: "og:description", content: "Acceso al sistema interno." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const runAudit = useServerFn(logAudit);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && session) nav({ to: "/dashboard" }); }, [session, loading, nav]);

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Bienvenido");
      runAudit({ data: { action: "auth.sign_in", entity: "session" } }).catch(() => {});
      nav({ to: "/dashboard" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ServiCompu Yarango</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Ingresar al sistema</CardTitle>
            <CardDescription>
              Acceso exclusivo para administradores y vendedores autorizados.
              Los clientes usan el <Link to="/consultar" className="underline">portal público</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={doSignIn} className="space-y-3">
              <div><Label>Correo</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Contraseña</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Ingresando…" : "Entrar"}</Button>
              <p className="pt-2 text-xs text-muted-foreground">
                ¿Necesitas una cuenta? Solicítala al administrador del sistema. El registro público
                está deshabilitado por seguridad.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}