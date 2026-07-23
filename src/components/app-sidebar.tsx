import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Users, ShoppingCart, ShieldCheck, BarChart3, Search, LogOut, Cpu, UserCog, ScrollText, Wrench, Shield } from "lucide-react";
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

import type { Permission } from "@/lib/permissions";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; adminOnly?: boolean; permission?: Permission };

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Nueva venta", url: "/sales/new", icon: ShoppingCart, permission: "sales.create" },
  { title: "Ventas", url: "/sales", icon: ShoppingCart, permission: "sales.view" },
  { title: "Productos", url: "/products", icon: Package, permission: "products.view" },
  { title: "Clientes", url: "/customers", icon: Users, permission: "customers.view" },
  { title: "Garantías", url: "/warranties", icon: ShieldCheck, permission: "warranties.view" },
  { title: "Servicio técnico", url: "/repairs", icon: Wrench, permission: "repairs.view" },
  { title: "Reportes", url: "/reports", icon: BarChart3, permission: "reports.view" },
  { title: "Usuarios", url: "/admin/users", icon: UserCog, adminOnly: true },
  { title: "Roles y permisos", url: "/admin/roles", icon: Shield, adminOnly: true },
  { title: "Auditoría", url: "/admin/audit", icon: ScrollText, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { user, role, isAdmin, can, signOut } = useAuth();
  const visible = items.filter((i) => {
    if (i.adminOnly) return isAdmin;
    if (i.permission) return can(i.permission);
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Cpu className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-black leading-tight">ServiCompu</div>
              <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">Yarango</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
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
                {!collapsed && <span className="ml-1 font-bold">PORTAL DE CLIENTES</span>}
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