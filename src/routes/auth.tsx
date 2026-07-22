import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Monitor } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — CompuERP" },
      { name: "description", content: "Accede al panel del ERP de tu tienda de computadoras." },
      { property: "og:title", content: "Ingresar — CompuERP" },
      { property: "og:description", content: "Accede al panel del ERP." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && session) nav({ to: "/dashboard" }); }, [session, loading, nav]);

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Bienvenido"); nav({ to: "/dashboard" }); }
  };

  const doSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Cuenta creada. Revisa tu correo si es necesario."); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Monitor className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">CompuERP</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Accede al sistema</CardTitle>
            <CardDescription>Panel para administradores y vendedores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="in">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="in">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="up">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="in">
                <form onSubmit={doSignIn} className="space-y-3">
                  <div><Label>Correo</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Contraseña</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Ingresando…" : "Entrar"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="up">
                <form onSubmit={doSignUp} className="space-y-3">
                  <div><Label>Nombre completo</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div><Label>Correo</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>Contraseña</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creando…" : "Crear cuenta"}</Button>
                  <p className="text-xs text-muted-foreground">El primer usuario se registra como Administrador. Los siguientes son Vendedores.</p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}