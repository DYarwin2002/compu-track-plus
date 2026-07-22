import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});

function AdminGate() {
  const { isAdmin, role, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    // role starts null then resolves; only redirect once we know the role.
    if (!loading && role !== null && !isAdmin) nav({ to: "/dashboard" });
  }, [isAdmin, role, loading, nav]);
  if (role === null) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!isAdmin) return null;
  return <Outlet />;
}