import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Monitor } from "lucide-react";

export function LoginDialog({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const runAudit = useServerFn(logAudit);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bienvenido");
    runAudit({ data: { action: "auth.sign_in", entity: "session" } }).catch(() => {});
    setOpen(false);
    nav({ to: "/dashboard" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Monitor className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-black">ServiCompu Yarango</span>
          </div>
          <DialogTitle>Ingresar al sistema</DialogTitle>
          <DialogDescription>
            Acceso exclusivo para el personal autorizado. Los clientes usan el portal público.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={doSignIn} className="space-y-3">
          <div>
            <Label>Correo</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Ingresando…" : "Entrar"}
          </Button>
          <p className="pt-1 text-xs text-muted-foreground">
            ¿Necesitas una cuenta? Solicítala al administrador. El registro público está deshabilitado.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}