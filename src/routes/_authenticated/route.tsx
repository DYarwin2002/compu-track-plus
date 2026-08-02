import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/database/client";
import { useAuth } from "@/frontend/hooks/use-auth";
import { AppSidebar } from "@/frontend/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/frontend/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Guardia real: corre antes de renderizar en cada navegación (URL directa,
  // atrás/adelante o enlace). Sin sesión válida no se monta nada.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", replace: true });
    }
  },
  component: Layout,
});

function Layout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="no-print sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}