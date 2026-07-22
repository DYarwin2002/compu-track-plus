import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, ShoppingCart, ShieldCheck, BarChart3, Search, LogOut, Monitor } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Nueva venta", url: "/sales/new", icon: ShoppingCart },
  { title: "Ventas", url: "/sales", icon: ShoppingCart },
  { title: "Productos", url: "/products", icon: Package },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Garantías", url: "/warranties", icon: ShieldCheck },
  { title: "Reportes", url: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, role, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <Monitor className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold tracking-tight">CompuERP</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent className="px-2">
            <Button asChild size={collapsed ? "icon" : "lg"} className="w-full shadow-lg" style={{ background: "var(--gradient-primary)" }}>
              <Link to="/consultar" target="_blank">
                <Search className="h-4 w-4" />
                {!collapsed && <span className="ml-1 font-bold">CONSULTAR GARANTÍA</span>}
              </Link>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 border-t border-sidebar-border p-2">
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{role ?? "…"}</p>
            </div>
          )}
          <Button size="icon" variant="ghost" onClick={() => signOut()} title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}