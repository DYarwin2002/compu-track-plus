import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSellers,
  createSeller,
  updateSellerRole,
  setSellerActive,
  resetSellerPassword,
} from "@/backend/functions/admin-users.functions";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/frontend/components/ui/table";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/frontend/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/frontend/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, KeyRound } from "lucide-react";
import { useAuth } from "@/frontend/hooks/use-auth";
import { formatDate } from "@/frontend/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuarios — ServiCompu Yarango" },
      { name: "description", content: "Administración de vendedores y administradores del ERP." },
    ],
  }),
  component: AdminUsers,
});

type Seller = Awaited<ReturnType<typeof listSellers>>[number];
type RoleOpt = { key: string; label: string };

function AdminUsers() {
  const { user } = useAuth();
  const runList = useServerFn(listSellers);
  const runCreate = useServerFn(createSeller);
  const runRole = useServerFn(updateSellerRole);
  const runActive = useServerFn(setSellerActive);
  const runReset = useServerFn(resetSellerPassword);

  const [rows, setRows] = useState<Seller[]>([]);
  const [roleOpts, setRoleOpts] = useState<RoleOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "vendedor" });
  const [busy, setBusy] = useState(false);
  const [resetFor, setResetFor] = useState<Seller | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const [list, { data: roles }] = await Promise.all([
        runList(),
        supabase.from("roles").select("key, label").order("sort_order"),
      ]);
      setRows(list);
      setRoleOpts((roles ?? []) as RoleOpt[]);
    }
    catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await runCreate({ data: form });
      toast.success("Usuario creado");
      setOpenNew(false);
      setForm({ email: "", password: "", full_name: "", role: "vendedor" });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally { setBusy(false); }
  };

  const changeRole = async (u: Seller, role: string) => {
    try { await runRole({ data: { user_id: u.id, role } }); toast.success("Rol actualizado"); reload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  };

  const toggleActive = async (u: Seller) => {
    try { await runActive({ data: { user_id: u.id, active: !u.active } }); toast.success(u.active ? "Cuenta desactivada" : "Cuenta activada"); reload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor) return;
    setBusy(true);
    try {
      await runReset({ data: { user_id: resetFor.id, password: newPassword } });
      toast.success("Contraseña actualizada");
      setResetFor(null); setNewPassword("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Solo el administrador puede crear y gestionar cuentas del ERP.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Nuevo usuario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear cuenta</DialogTitle></DialogHeader>
            <form onSubmit={submitNew} className="space-y-3">
              <div><Label>Nombre completo</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Correo</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Contraseña temporal</Label><Input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roleOpts.map((r) => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cuentas registradas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Sin usuarios</TableCell></TableRow>}
              {rows.map((u) => {
                const isSelf = user?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}</TableCell>
                    <TableCell>{u.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => changeRole(u, v)} disabled={isSelf}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {roleOpts.map((r) => (
                            <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.active ? <Badge variant="default">Activa</Badge> : <Badge variant="destructive">Desactivada</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setResetFor(u)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" /> Contraseña
                      </Button>
                      <Button size="sm" variant={u.active ? "ghost" : "default"} onClick={() => toggleActive(u)} disabled={isSelf}>
                        {u.active ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!resetFor} onOpenChange={(o) => { if (!o) { setResetFor(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restablecer contraseña</DialogTitle></DialogHeader>
          <form onSubmit={submitReset} className="space-y-3">
            <p className="text-sm text-muted-foreground">Cuenta: <b>{resetFor?.email}</b></p>
            <div><Label>Nueva contraseña</Label><Input type="text" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}