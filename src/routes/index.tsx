import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Monitor, ShieldCheck, Zap, BarChart3, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CompuERP — ERP para venta y garantías de computadoras" },
      { name: "description", content: "Registra ventas, controla stock, genera boletas y consulta garantías en segundos." },
      { property: "og:title", content: "CompuERP" },
      { property: "og:description", content: "ERP para tu negocio de venta y reparación de computadoras." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
              <Monitor className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">CompuERP</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/consultar">Consultar garantía</Link></Button>
            <Button asChild><Link to="/auth">Ingresar</Link></Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" /> ERP rápido para tu tienda de cómputo
        </span>
        <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-6xl">
          Vende, factura y controla{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>garantías</span>{" "}
          en segundos.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Registra productos con número de serie, genera boletas imprimibles y verifica garantías al instante frente al cliente.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth">Empezar ahora</Link></Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/consultar"><Search className="mr-2 h-4 w-4" /> Consultar garantía</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Garantías automáticas", desc: "Cada venta genera la garantía por número de serie y calcula vencimiento." },
          { icon: BarChart3, title: "Dashboard en tiempo real", desc: "Ventas del mes, garantías activas, próximas a vencer y stock bajo." },
          { icon: Zap, title: "Boletas rápidas", desc: "Impresión térmica 80mm o A4, con IGV calculado automáticamente." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <f.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
