import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/database/client";
import { logAudit } from "@/backend/functions/audit.functions";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/frontend/components/ui/dialog";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { useAlert } from "@/frontend/components/alert-modal";
import { authErrorMessage } from "@/frontend/lib/auth-errors";

export function LoginDialog({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const runAudit = useServerFn(logAudit);
  const { alert, alertModal } = useAlert();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      alert({ title: "Faltan datos", description: "Ingresa tu correo y tu contraseña para continuar." });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      alert(authErrorMessage(error.message));
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
        <form onSubmit={doSignIn} className="space-y-3" noValidate>
          <div>
            <Label>Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Ingresando…" : "Entrar"}
          </Button>
          <p className="pt-1 text-xs text-muted-foreground">
            ¿Necesitas una cuenta? Solicítala al administrador. El registro público está deshabilitado.
          </p>
        </form>
      </DialogContent>
      {alertModal}
    </Dialog>
  );
}