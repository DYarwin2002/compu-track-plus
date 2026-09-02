import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  lookupSaleByNumber, getPublicSalePdfData, getPublicCustomerHistory,
  type PublicSaleSummary, type PublicCustomerHistory,
} from "@/backend/functions/public-sales.functions";
import { downloadBoletaPDF } from "@/frontend/lib/boleta-pdf";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/frontend/components/ui/tabs";
import { Search, Download, FileText, Package, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatSoles } from "@/frontend/lib/format";
import { toast } from "sonner";
import logoSebas from "@/assets/logo-sebas-urban.jpg.asset.json";

const STEPS = ["Pendiente", "En preparación", "Enviado", "Entregado"] as const;

function statusMeta(status: string) {
  if (status === "Cancelado") return { Icon: XCircle, tone: "bg-destructive text-destructive-foreground", label: "Cancelado" };
  if (status === "Entregado") return { Icon: CheckCircle2, tone: "bg-emerald-500 text-white", label: "Entregado" };
  if (status === "Enviado") return { Icon: Truck, tone: "bg-primary text-primary-foreground", label: "En camino" };
  if (status === "En preparación") return { Icon: Package, tone: "bg-amber-500 text-white", label: "En preparación" };
  return { Icon: Clock, tone: "bg-muted text-foreground", label: "Pendiente" };
}

function Portal() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSebas.url} alt="Logo Sebas Urban" className="h-10 w-10 rounded-lg bg-black object-contain" />
            <div>
              <div className="text-sm font-black leading-tight tracking-tight">SEBAS URBAN</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portal de clientes</div>
            </div>
          </Link>
          <Button asChild variant="ghost"><Link to="/auth">Ingresar</Link></Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Sigue tu pedido</h1>
        <p className="mt-2 text-muted-foreground">
          Consulta el estado de tu pedido y descarga tu boleta. Solo necesitas tu N° de boleta o tu DNI.
        </p>

        <Tabs defaultValue="dni" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dni">Por DNI</TabsTrigger>
            <TabsTrigger value="boleta">Por N° de boleta</TabsTrigger>
          </TabsList>
          <TabsContent value="dni" className="pt-4"><DniSearch /></TabsContent>
          <TabsContent value="boleta" className="pt-4"><BoletaSearch /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OrderTracker({ status }: { status: string }) {
  if (status === "Cancelado") {
    return <p className="text-sm font-semibold text-destructive">Este pedido fue cancelado.</p>;
  }
  const idx = Math.max(0, STEPS.indexOf(status as (typeof STEPS)[number]));
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
          <p className={`mt-1 text-[10px] leading-tight ${i <= idx ? "font-bold text-foreground" : "text-muted-foreground"}`}>{s}</p>
        </div>
      ))}
    </div>
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
        <div className="mt-6">
          <SaleCard
            sale={row}
            onDownload={async (verifier) => {
              const full = await runFull({ data: { sale_id: row.id, verifier } });
              await downloadBoletaPDF(full);
            }}
            hint="Ingresa tu DNI o los últimos 4 caracteres del N° de boleta para descargarla."
          />
        </div>
      )}
    </>
  );
}

function DniSearch() {
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
      if (h.sales.length === 0) setErr("No encontramos pedidos asociados a ese documento.");
      setHistory(h);
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
      {history && history.sales.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Tus pedidos ({history.sales.length})
          </h2>
          {history.sales.map((r) => (
            <SaleCard
              key={r.id}
              sale={r}
              fixedVerifier={doc.trim()}
              onDownload={async (verifier) => {
                const full = await runFull({ data: { sale_id: r.id, verifier } });
                await downloadBoletaPDF(full);
              }}
            />
          ))}
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
  const meta = statusMeta(sale.order_status);

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
    <Card className="overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2 text-sm font-bold ${meta.tone}`}>
        <meta.Icon className="h-4 w-4" /> {meta.label}
      </div>
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
      <CardContent className="space-y-4">
        <OrderTracker status={sale.order_status} />
        {fixedVerifier ? (
          <Button onClick={download} disabled={busy} className="w-full"><Download className="mr-2 h-4 w-4" /> Descargar boleta PDF</Button>
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

export default Portal;
