import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/backend/functions/audit.functions";
import { Input } from "@/frontend/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { Badge } from "@/frontend/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";



type Row = Awaited<ReturnType<typeof listAudit>>[number];

function AuditPage() {
  const run = useServerFn(listAudit);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (search?: string) => {
    setLoading(true);
    try { setRows(await run({ data: { limit: 200, search: search || undefined } })); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Últimos 200 eventos registrados en el sistema.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar acción, entidad, correo o IP" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Eventos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Sin eventos</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{new Date(r.created_at).toLocaleString("es-PE")}</TableCell>
                  <TableCell className="text-xs">{r.user_email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.entity ?? "—"}{r.entity_id ? <span className="ml-1 text-muted-foreground">({r.entity_id.slice(0, 8)}…)</span> : null}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuditPage;
