import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/database/client";
import { useAuth } from "@/frontend/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth", replace: true });
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (roleRow?.role !== "admin") throw redirect({ to: "/dashboard", replace: true });
  },
  component: AdminGate,
});

function AdminGate() {
  const { isAdmin, role, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    // role starts null then resolves; only redirect once we know the role.
    if (!loading && role !== null && !isAdmin) nav({ to: "/dashboard", replace: true });
  }, [isAdmin, role, loading, nav]);
  if (role === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!isAdmin) return null;
  return <Outlet />;
}