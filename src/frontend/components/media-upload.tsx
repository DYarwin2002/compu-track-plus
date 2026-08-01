import { useEffect, useRef, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia, signedMediaUrl, removeMedia } from "@/frontend/lib/media";

export function MediaUpload({
  value,
  onChange,
  folder,
  hint = "JPG o PNG, máx. 5 MB",
}: {
  value: string | null | undefined;
  onChange: (path: string | null) => void;
  folder: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (!value) { setPreview(null); return; }
    signedMediaUrl(value).then((u) => { if (alive) setPreview(u); });
    return () => { alive = false; };
  }, [value]);

  const pick = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecciona una imagen");
    if (file.size > 5 * 1024 * 1024) return toast.error("La imagen supera 5 MB");
    setBusy(true);
    try {
      const path = await uploadMedia(folder, file);
      onChange(path);
      toast.success("Imagen cargada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
        {preview ? (
          <img src={preview} alt="Vista previa" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-2 h-3.5 w-3.5" />}
            {value ? "Cambiar" : "Subir imagen"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => { removeMedia(value); onChange(null); }}>
              <X className="mr-1 h-3.5 w-3.5" /> Quitar
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}