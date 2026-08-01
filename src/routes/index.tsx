import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/frontend/hooks/use-auth";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Input } from "@/frontend/components/ui/input";
import { getPublicCatalog } from "@/backend/functions/public-catalog.functions";
import { formatSoles } from "@/frontend/lib/format";
import { LoginDialog } from "@/frontend/components/login-dialog";
import heroTienda from "@/assets/hero-tienda.jpg";
import logoServi from "@/assets/logo-servicompu.jpg.asset.json";
import { BUSINESS } from "@/frontend/lib/business";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/frontend/components/ui/dialog";
import {
  Monitor, ShieldCheck, Zap, Search, Wrench, Truck, CreditCard, Cpu,
  Sparkles, LayoutGrid, Phone, MapPin, Clock, MessageCircle, Package,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiCompu Yarango — Venta y reparación de computadoras" },
      { name: "description", content: "Catálogo de laptops, PCs, componentes y accesorios con garantía. Servicio técnico especializado y portal de clientes para consultar garantías y boletas." },
      { property: "og:title", content: "ServiCompu Yarango — Tienda y servicio técnico" },
      { property: "og:description", content: "Equipos con garantía, precios claros y soporte técnico. Consulta tu garantía en línea." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session } = useAuth();
  const fetchCatalog = useServerFn(getPublicCatalog);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-catalog"],
    queryFn: () => fetchCatalog(),
  });

  const [cat, setCat] = useState<string>("Todos");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<(typeof products)[number] | null>(null);

  const waLink = (text: string) =>
    `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "Todos" && p.category !== cat) return false;
      if (!term) return true;
      return [p.name, p.brand, p.model, p.category].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [products, cat, q]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src={logoServi.url}
              alt="Logo ServiCompu Yarango"
              className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm"
            />
            <span className="truncate text-base font-black tracking-tight sm:text-lg">ServiCompu Yarango</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="shadow" style={{ background: "var(--gradient-primary)" }}>
              <Link to="/consultar">
                <Search className="h-4 w-4" />
                <span className="ml-1 hidden font-bold sm:inline">Portal de clientes</span>
                <span className="ml-1 font-bold sm:hidden">Portal</span>
              </Link>
            </Button>
            {session ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard">Mi panel</Link>
              </Button>
            ) : (
              <LoginDialog>
                <Button size="sm" variant="outline">Ingresar</Button>
              </LoginDialog>
            )}
          </div>
        </div>
      </header>

      {/* Foto de portada */}
      <section className="relative w-full overflow-hidden border-b border-border">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9] lg:aspect-[24/7]">
          <img
            src={heroTienda}
            alt="Tienda ServiCompu Yarango: venta, reparación y garantía de computadoras"
            width={1920}
            height={848}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/45 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <img
                  src={logoServi.url}
                  alt=""
                  aria-hidden
                  className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain p-1 shadow-lg sm:h-24 sm:w-24"
                />
                <div className="min-w-0">
                  <p className="text-2xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                    ServiCompu <span className="text-primary">Yarango</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-base">
                    Venta · Reparación · Garantía
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero / publicidad */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Tienda + servicio técnico en Yarango
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              Laptops, PCs y componentes{" "}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                con garantía real
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Equipos nuevos y seminuevos revisados, upgrades de RAM y SSD, mantenimiento y reparación.
              Cada compra genera tu garantía digital que puedes consultar en línea cuando quieras.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" style={{ background: "var(--gradient-primary)" }}>
                <a href="#catalogo"><LayoutGrid className="mr-2 h-4 w-4" /> Ver catálogo</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/consultar"><ShieldCheck className="mr-2 h-4 w-4" /> Consultar mi garantía</Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              {[
                { k: "Garantía", v: "Hasta 24 meses" },
                { k: "Soporte", v: "Técnico propio" },
                { k: "Boletas", v: "Descarga en PDF" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</p>
                  <p className="mt-1 text-sm font-bold">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-border bg-background p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black">Promoción del mes</p>
                  <p className="text-xs text-muted-foreground">Válido hasta agotar stock</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { i: Cpu, t: "Upgrade SSD 480GB + instalación", d: "Deja tu equipo listo el mismo día" },
                  { i: Wrench, t: "Mantenimiento preventivo", d: "Limpieza, pasta térmica y diagnóstico" },
                  { i: ShieldCheck, t: "Garantía extendida", d: "Amplía la cobertura de tu equipo" },
                ].map((p) => (
                  <li key={p.t} className="flex gap-3 rounded-xl border border-border bg-card/50 p-3">
                    <p.i className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">{p.t}</p>
                      <p className="text-xs text-muted-foreground">{p.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-5 w-full" variant="outline">
                <Link to="/consultar">Ya soy cliente — ver mis garantías</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {[
          { icon: ShieldCheck, t: "Garantía digital", d: "Consulta el estado por serie o DNI." },
          { icon: Wrench, t: "Servicio técnico", d: "Órdenes con seguimiento en línea." },
          { icon: CreditCard, t: "Pagos flexibles", d: "Efectivo, tarjeta, Yape y Plin." },
          { icon: Truck, t: "Entrega rápida", d: "Delivery local coordinado." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-border bg-card p-5">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-sm font-bold">{f.t}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>

      {/* Catálogo */}
      <section id="catalogo" className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Catálogo disponible</h2>
              <p className="mt-1 text-sm text-muted-foreground">Productos con stock en tienda. Precios en soles, incluyen IGV.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o marca…" className="pl-9" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-background" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              No hay productos que coincidan con tu búsqueda.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex cursor-pointer flex-col rounded-2xl border border-border bg-background p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={`${p.name}${p.brand ? " " + p.brand : ""}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <Monitor className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{p.category}</Badge>
                    <Badge variant={p.condition === "nuevo" ? "default" : "outline"} className="text-[10px] capitalize">
                      {p.condition}
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-snug">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.brand, p.model].filter(Boolean).join(" · ") || "Equipo de tienda"}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-black text-primary">{formatSoles(p.sale_price)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Garantía {p.default_warranty_months} meses
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {p.stock} en stock
                    </span>
                  </div>
                  <span className="mt-3 text-[11px] font-semibold text-primary">Ver detalle →</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Detalle de producto */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left text-lg font-black">{selected.name}</DialogTitle>
                <DialogDescription className="text-left">
                  {[selected.brand, selected.model].filter(Boolean).join(" · ") || selected.category}
                </DialogDescription>
              </DialogHeader>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground">
                    <Package className="h-10 w-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Precio</p>
                  <p className="mt-1 text-sm font-black text-primary">{formatSoles(selected.sale_price)}</p>
                </div>
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Garantía</p>
                  <p className="mt-1 text-sm font-bold">{selected.default_warranty_months} meses</p>
                </div>
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Stock</p>
                  <p className="mt-1 text-sm font-bold">{selected.stock}</p>
                </div>
              </div>
              <Button asChild size="lg" className="w-full font-bold" style={{ background: "var(--gradient-primary)" }}>
                <a
                  href={waLink(
                    `Hola ${BUSINESS.name}, quiero consultar por: ${selected.name} (${formatSoles(selected.sale_price)}).`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Consultar por WhatsApp
                </a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border p-8 text-center sm:p-12" style={{ background: "var(--gradient-primary)" }}>
          <h2 className="text-2xl font-black text-primary-foreground sm:text-3xl">¿Ya compraste con nosotros?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85">
            Revisa el estado de tu garantía, el avance de tu reparación y descarga tu boleta en PDF desde el portal de clientes.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 font-bold">
            <Link to="/consultar"><Search className="mr-2 h-4 w-4" /> Entrar al portal de clientes</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-black">ServiCompu Yarango</p>
            <p className="mt-2 text-xs text-muted-foreground">Venta, mantenimiento y reparación de computadoras.</p>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Yarango, Perú</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> Atención por WhatsApp</p>
            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> Lun a Sáb · 9:00 – 19:00</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-xs">
            <Link to="/consultar" className="font-semibold text-primary hover:underline">Portal de clientes</Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Acceso del personal</Link>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a
        href={waLink(`Hola ${BUSINESS.name}, necesito información.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-xl transition-transform hover:scale-105"
        style={{ background: "var(--gradient-primary)" }}
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
