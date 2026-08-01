import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Checkbox } from "@/frontend/components/ui/checkbox";
import { Badge } from "@/frontend/components/ui/badge";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/frontend/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Save, Loader2, Plus, Trash2, Lock } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "@/frontend/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles y permisos — ServiCompu Yarango" },
      { name: "description", content: "Crea roles personalizados y define qué puede hacer cada uno." },
    ],
  }),
  component: RolesPage,
});

type Role = { key: string; label: string; description: string | null; is_system: boolean; sort_order: number };

function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<Permission>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", description: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: rr, error: er }, { data: rp, error: ep }] = await Promise.all([
      supabase.from("roles").select("*").order("sort_order").order("label"),
      supabase.from("role_permissions").select("role, permission"),
    ]);
    if (er) toast.error(er.message);
    if (ep) toast.error(ep.message);
    const roleRows = (rr ?? []) as Role[];
    setRoles(roleRows);
    const next: Record<string, Set<Permission>> = {};
    roleRows.forEach((r) => {
      next[r.key] = r.key === "admin" ? new Set(ALL_PERMISSIONS) : new Set();
    });
    (rp ?? []).forEach((r) => {
      if (next[r.role]) next[r.role].add(r.permission as Permission);
    });
    setMatrix(next);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = (role: string, perm: Permission) => {
    if (role === "admin") return; // admin always all
    setMatrix((m) => {
      const copy: Record<string, Set<Permission>> = { ...m };
      copy[role] = new Set(copy[role] ?? []);
      if (copy[role].has(perm)) copy[role].delete(perm);
      else copy[role].add(perm);
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Sync all non-admin roles (admin is implicit).
      for (const role of roles.filter((r) => r.key !== "admin")) {
        const desired = matrix[role.key] ?? new Set<Permission>();
        const { data: current } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role", role.key as never);
        const currentSet = new Set((current ?? []).map((c) => c.permission as Permission));
        const toAdd: Permission[] = [];
        const toRemove: Permission[] = [];
        desired.forEach((p) => { if (!currentSet.has(p)) toAdd.push(p); });
        currentSet.forEach((p) => { if (!desired.has(p)) toRemove.push(p); });
        if (toAdd.length) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(toAdd.map((p) => ({ role: role.key, permission: p })) as never);
          if (error) throw error;
        }
        if (toRemove.length) {
          const { error } = await supabase
            .from("role_permissions")
            .delete()
            .eq("role", role.key as never)
            .in("permission", toRemove);
          if (error) throw error;
        }
      }
      toast.success("Permisos guardados");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    const key = form.key.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]{1,31}$/.test(key)) {
      return toast.error("Clave inválida. Usa minúsculas, números y guion bajo (ej. cajero).");
    }
    if (!form.label.trim()) return toast.error("El nombre visible es obligatorio.");
    const { error } = await supabase.from("roles").insert({
      key, label: form.label.trim(), description: form.description.trim() || null, is_system: false, sort_order: 100,
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Rol creado");
    setOpenNew(false); setForm({ key: "", label: "", description: "" });
    load();
  };

  const deleteRole = async (role: Role) => {
    if (role.is_system) return;
    if (!confirm(`¿Eliminar el rol "${role.label}"? Los usuarios asignados a este rol deberán ser reasignados primero.`)) return;
    const { error } = await supabase.from("roles").delete().eq("key", role.key);
    if (error) return toast.error(error.message.includes("foreign key") ? "Hay usuarios usando este rol. Reasígnalos antes de eliminarlo." : error.message);
    toast.success("Rol eliminado");
    load();
  };

  const updateRoleLabel = async (role: Role, label: string) => {
    if (label === role.label) return;
    const { error } = await supabase.from("roles").update({ label } as never).eq("key", role.key);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Shield className="h-6 w-6" /> Roles y permisos
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea roles personalizados y marca sus permisos. Los administradores siempre tienen acceso completo.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Nuevo rol</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear rol personalizado</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Clave interna</Label>
                  <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="cajero" />
                  <p className="mt-1 text-xs text-muted-foreground">Solo minúsculas, números y guion bajo. Ejemplo: <code>tecnico</code>.</p>
                </div>
                <div>
                  <Label>Nombre visible</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Cajero" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
                </div>
              </div>
              <DialogFooter><Button onClick={createRole}>Crear rol</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar permisos
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Roles definidos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((r) => (
                  <div key={r.key} className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          defaultValue={r.label}
                          onBlur={(e) => updateRoleLabel(r, e.target.value.trim())}
                          className="h-8 font-semibold"
                          disabled={r.is_system}
                        />
                        {r.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{r.key}</p>
                      {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                    {!r.is_system && (
                      <Button size="icon" variant="ghost" onClick={() => deleteRole(r)} title="Eliminar rol">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => (
              <Card key={group.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{group.label}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-muted-foreground">
                        <th className="text-left font-normal">Permiso</th>
                        {roles.map((r) => (
                          <th key={r.key} className="px-2 text-center font-normal">{r.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.key} className="border-t border-border">
                          <td className="py-2 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{item.label}</span>
                              {item.hint && <Badge variant="outline" className="text-[10px]">{item.hint}</Badge>}
                            </div>
                          </td>
                          {roles.map((r) => (
                            <td key={r.key} className="px-2 py-2 text-center">
                              <Checkbox
                                checked={r.key === "admin" ? true : (matrix[r.key]?.has(item.key) ?? false)}
                                disabled={r.key === "admin"}
                                onCheckedChange={() => toggle(r.key, item.key)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}