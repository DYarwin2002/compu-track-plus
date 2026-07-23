import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Save, Loader2 } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles y permisos — ServiCompu Yarango" },
      { name: "description", content: "Define qué puede hacer cada rol dentro del sistema." },
    ],
  }),
  component: RolesPage,
});

type Role = "admin" | "vendedor";
const ROLES: Role[] = ["admin", "vendedor"];

function RolesPage() {
  const [matrix, setMatrix] = useState<Record<Role, Set<Permission>>>({
    admin: new Set(ALL_PERMISSIONS),
    vendedor: new Set(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("role_permissions").select("role, permission");
    if (error) toast.error(error.message);
    const next: Record<Role, Set<Permission>> = {
      admin: new Set(ALL_PERMISSIONS),
      vendedor: new Set(),
    };
    (data ?? []).forEach((r) => {
      const role = r.role as Role;
      if (next[role]) next[role].add(r.permission as Permission);
    });
    setMatrix(next);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = (role: Role, perm: Permission) => {
    if (role === "admin") return; // admin always all
    setMatrix((m) => {
      const copy: Record<Role, Set<Permission>> = { admin: m.admin, vendedor: new Set(m.vendedor) };
      if (copy[role].has(perm)) copy[role].delete(perm);
      else copy[role].add(perm);
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Sync only editable roles (vendedor). Admin is implicit.
      for (const role of ROLES.filter((r) => r !== "admin")) {
        const desired = matrix[role];
        const { data: current } = await supabase
          .from("role_permissions")
          .select("permission")
          .eq("role", role);
        const currentSet = new Set((current ?? []).map((c) => c.permission as Permission));
        const toAdd: Permission[] = [];
        const toRemove: Permission[] = [];
        desired.forEach((p) => { if (!currentSet.has(p)) toAdd.push(p); });
        currentSet.forEach((p) => { if (!desired.has(p)) toRemove.push(p); });
        if (toAdd.length) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(toAdd.map((p) => ({ role, permission: p })));
          if (error) throw error;
        }
        if (toRemove.length) {
          const { error } = await supabase
            .from("role_permissions")
            .delete()
            .eq("role", role)
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black">
            <Shield className="h-6 w-6" /> Roles y permisos
          </h1>
          <p className="text-sm text-muted-foreground">
            Marca las acciones que cada rol puede realizar. Los administradores siempre tienen acceso completo.
          </p>
        </div>
        <Button onClick={save} disabled={saving || loading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => (
            <Card key={group.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-2 text-sm">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Permiso</div>
                  <div className="text-center text-xs uppercase text-muted-foreground">Admin</div>
                  <div className="text-center text-xs uppercase text-muted-foreground">Vendedor</div>
                  {group.items.map((item) => (
                    <PermRow
                      key={item.key}
                      label={item.label}
                      hint={item.hint}
                      checkedAdmin
                      checkedVendedor={matrix.vendedor.has(item.key)}
                      onToggleVendedor={() => toggle("vendedor", item.key)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PermRow({
  label, hint, checkedAdmin, checkedVendedor, onToggleVendedor,
}: {
  label: string;
  hint?: string;
  checkedAdmin: boolean;
  checkedVendedor: boolean;
  onToggleVendedor: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span>{label}</span>
        {hint && <Badge variant="outline" className="text-[10px]">{hint}</Badge>}
      </div>
      <div className="flex justify-center">
        <Checkbox checked={checkedAdmin} disabled />
      </div>
      <div className="flex justify-center">
        <Checkbox checked={checkedVendedor} onCheckedChange={onToggleVendedor} />
      </div>
    </>
  );
}