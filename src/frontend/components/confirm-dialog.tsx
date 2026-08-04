import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

/**
 * Confirmación con modal propio (reemplaza al window.confirm del navegador).
 * Uso: const { confirm, confirmDialog } = useConfirm();
 *      if (!(await confirm({ title: "…" }))) return;
 *      … y renderiza {confirmDialog} dentro del componente.
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: "" });
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const confirmDialog = (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                opts.destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left">
              <AlertDialogTitle className="text-base font-black">{opts.title}</AlertDialogTitle>
              {opts.description && (
                <AlertDialogDescription className="mt-1 text-sm">{opts.description}</AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{opts.cancelText ?? "Cancelar"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={opts.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {opts.confirmText ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}