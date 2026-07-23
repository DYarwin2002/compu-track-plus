import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupWarranty, type PublicWarranty } from "@/lib/warranty-lookup.functions";
import {
  lookupSaleByNumber, lookupSalesByDocument, getPublicSalePdfData,
  type PublicSaleSummary,
} from "@/lib/public-sales.functions";
import { downloadBoletaPDF } from "@/lib/boleta-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Cpu, ShieldCheck, ShieldAlert, ShieldX, Download, FileText } from "lucide-react";
import { computeWarrantyStatus, daysUntil, formatDate, formatSoles } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/consultar")({
  head: () => ({
    meta: [
      { title: "Portal de clientes — ServiCompu Yarango" },
      { name: "description", content: "Consulta tu garantía por número de serie o boleta y descarga tu boleta con tu DNI." },
      { property: "og:title", content: "Portal de clientes — ServiCompu Yarango" },
      { property: "og:description", content: "Consulta garantías y descarga tu boleta en segundos." },
    ],
  }),
  component: Portal,
});

function Portal() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black leading-tight">ServiCompu Yarango</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portal de clientes</div>
            </div>
          </Link>
          <Button asChild variant="ghost"><Link to="/auth">Ingresar</Link></Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Consulta y descarga</h1>
        <p className="mt-2 text-muted-foreground">
          Verifica tu garantía o descarga tu boleta. Solo necesitas tu N° de serie, N° de boleta o DNI.
        </p>

        <Tabs defaultValue="serial" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="serial">Por N° de serie</TabsTrigger>
            <TabsTrigger value="boleta">Por N° de boleta</TabsTrigger>
            <TabsTrigger value="dni">Por DNI</TabsTrigger>
          </TabsList>
          <TabsContent value="serial" className="pt-4"><WarrantySearch /></TabsContent>
          <TabsContent value="boleta" className="pt-4"><BoletaSearch /></TabsContent>
          <TabsContent value="dni" className="pt-4"><DniSearch /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function WarrantySearch() {
  const runLookup = useServerFn(lookupWarranty);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PublicWarranty[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setRows(null);
    try {
      const data = await runLookup({ data: { term: q.trim() } });
      if (data.length === 0) setErr("No encontramos garantías para tu búsqueda.");
      setRows(data);
    } catch { setErr("No pudimos completar la búsqueda."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Ej. SN123456" value={q} onChange={(e) => setQ(e.target.value)} className="text-lg" />
        <Button type="submit" disabled={busy || !q.trim()} size="lg"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
      </form>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <div className="mt-6 space-y-4">
        {rows?.map((r) => {
          const days = daysUntil(r.expires_at);
          const status = r.status === "Anulada" ? "Anulada" : computeWarrantyStatus(r.expires_at);
          const color = status === "Activa" ? "default" : status === "Próxima a vencer" ? "secondary" : "destructive";
          const Icon = status === "Activa" ? ShieldCheck : status === "Próxima a vencer" ? ShieldAlert : ShieldX;
          return (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate">{r.product_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Serie: {r.serial_number ?? "—"} · Boleta {r.sale_number ?? "—"}</p>
                </div>
                <Badge variant={color as "default" | "secondary" | "destructive"}><Icon className="mr-1 h-3.5 w-3.5" />{status}</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Compra</p><p className="font-medium">{formatDate(r.sale_date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Vence</p><p className="font-medium">{formatDate(r.expires_at)}</p></div>
                <div><p className="text-xs text-muted-foreground">Días restantes</p>
                  <p className={`font-bold ${days < 0 ? "text-destructive" : days <= 30 ? "text-orange-500" : "text-emerald-500"}`}>
                    {days < 0 ? `Vencida hace ${Math.abs(days)}d` : `${days} días`}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function BoletaSearch() {
  const runLookup = useServerFn(lookupSaleByNumber);
  const runFull = useServerFn(getPublicSalePdfData);
  const [num, setNum] = useState("");
  const [row, setRow] = useState<PublicSaleSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setRow(null); setBusy(true);
    try {
      const r = await runLookup({ data: { sale_number: num.trim().toUpperCase() } });
      if (!r) setErr("No encontramos una boleta con ese número.");
      setRow(r);
    } catch { setErr("Error al buscar."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Ej. B000123" value={num} onChange={(e) => setNum(e.target.value)} className="text-lg" />
        <Button type="submit" disabled={busy || !num.trim()} size="lg"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
      </form>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {row && (
        <SaleCard
          sale={row}
          onDownload={async (verifier) => {
            const full = await runFull({ data: { sale_id: row.id, verifier } });
            downloadBoletaPDF(full);
          }}
          hint="Ingresa tu DNI o los últimos 4 caracteres del N° de boleta para descargarla."
        />
      )}
    </>
  );
}

function DniSearch() {
  const runList = useServerFn(lookupSalesByDocument);
  const runFull = useServerFn(getPublicSalePdfData);
  const [doc, setDoc] = useState("");
  const [rows, setRows] = useState<PublicSaleSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setRows(null); setBusy(true);
    try {
      const list = await runList({ data: { document: doc.trim() } });
      if (list.length === 0) setErr("No encontramos boletas asociadas a ese documento.");
      setRows(list);
    } catch { setErr("Error al buscar."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Tu DNI o RUC" value={doc} onChange={(e) => setDoc(e.target.value)} className="text-lg" />
        <Button type="submit" disabled={busy || !doc.trim()} size="lg"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
      </form>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <div className="mt-6 space-y-3">
        {rows?.map((r) => (
          <SaleCard
            key={r.id}
            sale={r}
            fixedVerifier={doc.trim()}
            onDownload={async (verifier) => {
              const full = await runFull({ data: { sale_id: r.id, verifier } });
              downloadBoletaPDF(full);
            }}
          />
        ))}
      </div>
    </>
  );
}

function SaleCard({
  sale, onDownload, fixedVerifier, hint,
}: {
  sale: PublicSaleSummary;
  onDownload: (verifier: string) => Promise<void>;
  fixedVerifier?: string;
  hint?: string;
}) {
  const [verifier, setVerifier] = useState(fixedVerifier ?? "");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const v = (fixedVerifier ?? verifier).trim();
    if (!v) return toast.error("Ingresa tu DNI o los últimos 4 caracteres de la boleta.");
    setBusy(true);
    try {
      await onDownload(v);
      toast.success("Boleta descargada");
    } catch {
      toast.error("No pudimos validar tu identidad. Verifica los datos.");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> {sale.sale_number}</CardTitle>
          <p className="text-xs text-muted-foreground">{formatDate(sale.sale_date)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-black">{formatSoles(sale.total)}</p>
        </div>
      </CardHeader>
      <CardContent>
        {fixedVerifier ? (
          <Button onClick={download} disabled={busy} className="w-full"><Download className="mr-2 h-4 w-4" /> Descargar PDF</Button>
        ) : (
          <div className="space-y-2">
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <div className="flex gap-2">
              <Input placeholder="DNI o últimos 4 del N° de boleta" value={verifier} onChange={(e) => setVerifier(e.target.value)} />
              <Button onClick={download} disabled={busy}><Download className="mr-2 h-4 w-4" /> PDF</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}