import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupWarranty, type PublicWarranty } from "@/lib/warranty-lookup.functions";
import {
  lookupSaleByNumber, lookupSalesByDocument, getPublicSalePdfData,
  getPublicCustomerHistory,
  type PublicSaleSummary,
  type PublicCustomerHistory,
} from "@/lib/public-sales.functions";
import { downloadBoletaPDF } from "@/lib/boleta-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Cpu, ShieldCheck, ShieldAlert, ShieldX, Download, FileText, Wrench, Receipt } from "lucide-react";
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
        {rows?.map((r) => (
          <WarrantyStatusCard
            key={r.id}
            productName={r.product_name}
            serial={r.serial_number}
            saleNumber={r.sale_number}
            saleDate={r.sale_date}
            expiresAt={r.expires_at}
            status={r.status}
            durationMonths={r.duration_months}
          />
        ))}
      </div>
    </>
  );
}

function WarrantyStatusCard({
  productName, serial, saleNumber, saleDate, expiresAt, status: rawStatus, durationMonths,
}: {
  productName: string;
  serial: string | null;
  saleNumber: string | null;
  saleDate: string;
  expiresAt: string;
  status: string;
  durationMonths?: number;
}) {
  const days = daysUntil(expiresAt);
  const status = rawStatus === "Anulada" ? "Anulada" : computeWarrantyStatus(expiresAt);
  const palette =
    status === "Activa" ? { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", pill: "bg-emerald-500 text-white" }
    : status === "Próxima a vencer" ? { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600 dark:text-amber-400", pill: "bg-amber-500 text-white" }
    : { bg: "bg-destructive/10 border-destructive/30", text: "text-destructive", pill: "bg-destructive text-destructive-foreground" };
  const Icon = status === "Activa" ? ShieldCheck : status === "Próxima a vencer" ? ShieldAlert : ShieldX;

  // Progress: how much of the warranty is consumed
  const totalDays = durationMonths ? durationMonths * 30 : Math.max(1, Math.round((new Date(expiresAt).getTime() - new Date(saleDate).getTime()) / 86400000));
  const remaining = Math.max(days, 0);
  const usedPct = Math.min(100, Math.max(0, Math.round(((totalDays - remaining) / totalDays) * 100)));

  return (
    <Card className={`overflow-hidden border ${palette.bg}`}>
      <div className={`flex items-center justify-between px-4 py-2 text-sm font-bold ${palette.pill}`}>
        <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {status}</span>
        <span className="text-xs opacity-90">
          {days < 0 ? `Vencida hace ${Math.abs(days)} días` : `${days} días restantes`}
        </span>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-tight">{productName}</CardTitle>
        <p className="text-xs text-muted-foreground">Serie: {serial ?? "—"} · Boleta {saleNumber ?? "—"}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><p className="text-muted-foreground">Compra</p><p className="font-medium">{formatDate(saleDate)}</p></div>
          <div><p className="text-muted-foreground">Vence</p><p className="font-medium">{formatDate(expiresAt)}</p></div>
          <div><p className="text-muted-foreground">Duración</p><p className="font-medium">{durationMonths ?? "—"} meses</p></div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
            <span>Progreso</span><span>{usedPct}% consumido</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${status === "Activa" ? "bg-emerald-500" : status === "Próxima a vencer" ? "bg-amber-500" : "bg-destructive"}`} style={{ width: `${usedPct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
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
  const runHistory = useServerFn(getPublicCustomerHistory);
  const [doc, setDoc] = useState("");
  const [history, setHistory] = useState<PublicCustomerHistory | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setHistory(null); setBusy(true);
    try {
      const h = await runHistory({ data: { document: doc.trim() } });
      if (h.sales.length === 0 && h.warranties.length === 0 && h.repairs.length === 0) {
        setErr("No encontramos registros asociados a ese documento.");
      }
      setHistory(h);
    } catch { setErr("Error al buscar."); }
    finally { setBusy(false); }
  };

  // Suppress unused-var warning; keeping runList for compat with older callers
  void runList;

  return (
    <>
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Tu DNI o RUC" value={doc} onChange={(e) => setDoc(e.target.value)} className="text-lg" />
        <Button type="submit" disabled={busy || !doc.trim()} size="lg"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
      </form>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {history && (history.sales.length > 0 || history.warranties.length > 0 || history.repairs.length > 0) && (
        <div className="mt-6 space-y-6">
          {history.warranties.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Tus garantías ({history.warranties.length})
              </h2>
              <div className="space-y-3">
                {history.warranties.map((w) => (
                  <WarrantyStatusCard
                    key={w.id}
                    productName={w.product_name}
                    serial={w.serial_number}
                    saleNumber={w.sale_number}
                    saleDate={w.sale_date}
                    expiresAt={w.expires_at}
                    status={w.status}
                    durationMonths={w.duration_months}
                  />
                ))}
              </div>
            </section>
          )}

          {history.sales.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <Receipt className="h-4 w-4" /> Tus boletas ({history.sales.length})
              </h2>
              <div className="space-y-3">
                {history.sales.map((r) => (
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
            </section>
          )}

          {history.repairs.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                <Wrench className="h-4 w-4" /> Servicio técnico ({history.repairs.length})
              </h2>
              <div className="space-y-3">
                {history.repairs.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base">{r.device}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          OT {r.order_number} · Ingreso {formatDate(r.received_at)}
                        </p>
                      </div>
                      <Badge variant={r.status === "Entregado" ? "default" : r.status === "Cancelado" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {r.serial_number && <p className="text-xs text-muted-foreground">Serie: <span className="font-mono">{r.serial_number}</span></p>}
                      {r.reported_issue && <p><span className="text-xs text-muted-foreground">Falla reportada:</span> {r.reported_issue}</p>}
                      {r.diagnosis && <p><span className="text-xs text-muted-foreground">Diagnóstico:</span> {r.diagnosis}</p>}
                      {r.cost_estimate ? <p className="text-xs text-muted-foreground">Estimado: <span className="font-bold text-foreground">{formatSoles(r.cost_estimate)}</span></p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
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