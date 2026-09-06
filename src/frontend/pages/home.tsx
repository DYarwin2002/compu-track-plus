import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/frontend/hooks/use-auth";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Input } from "@/frontend/components/ui/input";
import { getPublicCatalog } from "@/backend/functions/public-catalog.functions";
import { formatSoles } from "@/frontend/lib/format";
import { LoginDialog } from "@/frontend/components/login-dialog";
import heroUrban from "@/assets/hero-urban.jpg";
import logoUrban from "@/assets/logo-sebas-urban.jpg.asset.json";
import { BUSINESS } from "@/frontend/lib/business";
import { downloadCotizacionPDF } from "@/frontend/lib/cotizacion-pdf";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/frontend/components/ui/dialog";
import {
  Shirt, Sparkles, Search, Truck, CreditCard, BadgeCheck, Package,
  LayoutGrid, Phone, MapPin, Clock, MessageCircle, FileDown, RefreshCcw,
} from "lucide-react";

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
  const [quote, setQuote] = useState<string[]>([]);

  // La lista de pedido sobrevive a recargas del navegador.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("su-cotizacion");
      if (raw) setQuote(JSON.parse(raw));
    } catch { /* almacenamiento no disponible */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("su-cotizacion", JSON.stringify(quote));
    } catch { /* almacenamiento no disponible */ }
  }, [quote]);

  const toggleQuote = (id: string) =>
    setQuote((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const waLink = (text: string) =>
    `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [
      { name: "Todos", count: products.length },
      ...Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [products]);

  const quoteItems = useMemo(() => products.filter((p) => quote.includes(p.id)), [products, quote]);
  const quoteTotal = quoteItems.reduce((s, p) => s + Number(p.sale_price), 0);
  const quoteMessage = () =>
    waLink(
      `Hola ${BUSINESS.name}, quiero pedir estos productos:\n` +
        quoteItems
          .map((p, i) => `${i + 1}. ${p.name}${p.size ? ` (Talla ${p.size})` : ""} — ${formatSoles(p.sale_price)}`)
          .join("\n") +
        `\n\nTotal referencial: ${formatSoles(quoteTotal)}`,
    );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "Todos" && p.category !== cat) return false;
      if (!term) return true;
      return [p.name, p.brand, p.model, p.category, p.size, p.color].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [products, cat, q]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img
              src={logoUrban.url}
              alt="Logo Sebas Urban"
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-primary/40"
            />
            <span className="truncate text-base font-black uppercase tracking-[0.18em] sm:text-lg">Sebas Urban</span>
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

      {/* Hero premium — siempre oscuro con acento dorado */}
      <section className="dark relative w-full overflow-hidden border-b border-border bg-background text-foreground">
        <img
          src={heroUrban}
          alt="Tienda Sebas Urban: zapatillas, hoodies y ropa urbana"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 22% 30%, color-mix(in oklab, var(--primary) 14%, transparent) 0%, transparent 55%)" }}
        />
        {/* Texto decorativo vertical */}
        <span
          aria-hidden
          className="font-display pointer-events-none absolute -right-4 top-8 hidden select-none text-[150px] font-black leading-none tracking-tighter text-foreground/5 xl:block"
          style={{ writingMode: "vertical-rl" }}
        >
          URBAN
        </span>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:py-28">
          {/* Contenido */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 lg:col-span-7">
            <div className="flex items-center gap-4">
              <img
                src={logoUrban.url}
                alt="Logo Sebas Urban"
                className="h-14 w-14 rounded-full border-2 border-primary/50 object-cover shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_35%,transparent)] transition-transform duration-500 hover:scale-110"
              />
              <div className="h-px w-12 bg-border" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Streetwear · Santa Cruz, Perú
              </span>
            </div>

            <h1 className="font-display mt-8 text-4xl font-black leading-[0.95] tracking-tighter sm:text-6xl lg:text-7xl">
              ZAPATILLAS Y ROPA URBANA{" "}
              <span
                className="bg-clip-text text-transparent drop-shadow-[0_4px_15px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                CON ESTILO PROPIO
              </span>
            </h1>

            <p className="mt-6 max-w-lg border-l-4 border-primary py-1 pl-5 text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
              Hoodies, polos, casacas, gorras y zapatillas seleccionadas. Elige tu talla, arma tu pedido
              y sigue su estado en línea hasta que llegue a tus manos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="px-8 font-black uppercase tracking-widest shadow-[0_15px_30px_-10px_color-mix(in_oklab,var(--primary)_50%,transparent)] transition-transform hover:-translate-y-1"
                style={{ background: "var(--gradient-primary)" }}
              >
                <a href="#catalogo"><LayoutGrid className="mr-2 h-4 w-4" /> Ver catálogo</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 px-8 font-black uppercase tracking-widest"
              >
                <Link to="/consultar"><Package className="mr-2 h-4 w-4" /> Seguir mi pedido</Link>
              </Button>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-center">
              {[
                { k: "Cambios", v: "Talla en 7 días" },
                { k: "Delivery", v: "Local y provincia" },
                { k: "Boletas", v: "Descarga en PDF" },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.k}</p>
                  <p className="mt-1 text-sm font-bold">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjeta Drop del mes */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-primary/15 blur-3xl" />
              <div className="relative rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      Drop del mes
                    </span>
                    <p className="font-display mt-2 text-xl font-extrabold leading-tight tracking-tight">
                      Nueva temporada
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Hasta agotar stock</p>
                  </div>
                  <span className="rounded bg-primary px-2 py-1 text-[10px] font-black uppercase text-primary-foreground shadow-lg">
                    Limitado
                  </span>
                </div>
                <ul className="mt-5 space-y-3 text-sm">
                  {[
                    { i: Shirt, t: "2 polos oversize", d: "Precio especial llevando el combo" },
                    { i: Package, t: "Zapatillas nuevas", d: "Tallas 35 a 44 disponibles" },
                    { i: RefreshCcw, t: "Cambio de talla", d: "7 días con etiqueta y sin uso" },
                  ].map((p) => (
                    <li key={p.t} className="flex gap-3 rounded-xl border border-border bg-background/60 p-3">
                      <p.i className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold">{p.t}</p>
                        <p className="text-xs text-muted-foreground">{p.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-5 w-full font-bold uppercase tracking-widest" variant="outline">
                  <Link to="/consultar"><Sparkles className="mr-2 h-4 w-4" /> Ya compré — ver mi pedido</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Línea dorada inferior */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: "var(--gradient-primary)" }} />
      </section>

      {/* Beneficios */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {[
          { icon: BadgeCheck, t: "Prendas originales", d: "Calidad revisada pieza por pieza." },
          { icon: RefreshCcw, t: "Cambio de talla", d: "7 días con etiqueta y sin uso." },
          { icon: CreditCard, t: "Pagos flexibles", d: "Efectivo, tarjeta, Yape y Plin." },
          { icon: Truck, t: "Envíos rápidos", d: "Delivery local y a provincia." },
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
              <p className="mt-1 text-sm text-muted-foreground">Prendas y zapatillas con stock en tienda. Precios en soles.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar prenda, marca o talla…" className="pl-9" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setCat(c.name)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  cat === c.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name}
                <span className="ml-1.5 opacity-70">{c.count}</span>
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
                        <Shirt className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{p.category}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{p.condition}</Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-snug">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.brand, p.model].filter(Boolean).join(" · ") || "Prenda de tienda"}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-black text-primary">{formatSoles(p.sale_price)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[p.size ? `Talla ${p.size}` : null, p.color].filter(Boolean).join(" · ") || "Talla única"}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {p.stock} en stock
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-primary">Ver detalle →</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleQuote(p.id); }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        quote.includes(p.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {quote.includes(p.id) ? "En mi pedido" : "+ Agregar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lista de pedido */}
      {quoteItems.length > 0 && (
        <div className="sticky bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur">
            <div className="min-w-0">
              <p className="text-sm font-black">
                {quoteItems.length} producto{quoteItems.length > 1 ? "s" : ""} en tu pedido
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Total referencial {formatSoles(quoteTotal)} · {quoteItems.map((p) => p.name).join(", ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setQuote([])}>Vaciar</Button>
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => downloadCotizacionPDF(quoteItems)}
              >
                <FileDown className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
              <Button asChild size="sm" className="font-bold" style={{ background: "var(--gradient-primary)" }}>
                <a href={quoteMessage()} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Pedir por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    <Shirt className="h-10 w-10 opacity-40" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Precio</p>
                  <p className="mt-1 text-sm font-black text-primary">{formatSoles(selected.sale_price)}</p>
                </div>
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Talla</p>
                  <p className="mt-1 text-sm font-bold">{selected.size || "Única"}</p>
                </div>
                <div className="rounded-xl border border-border p-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Color</p>
                  <p className="mt-1 text-sm font-bold">{selected.color || "—"}</p>
                </div>
              </div>
              <Button asChild size="lg" className="w-full font-bold" style={{ background: "var(--gradient-primary)" }}>
                <a
                  href={waLink(
                    `Hola ${BUSINESS.name}, quiero consultar por: ${selected.name}${selected.size ? ` (Talla ${selected.size})` : ""} (${formatSoles(selected.sale_price)}).`,
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
          <h2 className="text-2xl font-black text-primary-foreground sm:text-3xl">¿Ya hiciste tu pedido?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85">
            Revisa el estado de tu pedido y descarga tu boleta en PDF desde el portal de clientes.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 font-bold">
            <Link to="/consultar"><Search className="mr-2 h-4 w-4" /> Entrar al portal de clientes</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-black uppercase tracking-[0.18em]">Sebas Urban</p>
            <p className="mt-2 text-xs text-muted-foreground">Zapatillas y ropa urbana para tu día a día.</p>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> {BUSINESS.address}</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> Atención por WhatsApp</p>
            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> Lunes a Domingo · 9:00 – 19:00</p>
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

export default Landing;
