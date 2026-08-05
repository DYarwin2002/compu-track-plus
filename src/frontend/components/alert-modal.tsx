import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog";
import { AlertCircle, Info } from "lucide-react";

export type AlertOptions = {
  title: string;
  description?: string;
  actionText?: string;
  tone?: "error" | "info";
};

/**
 * Aviso con modal propio (reemplaza a los toasts de error y a las alertas del
 * navegador). Uso: const { alert, alertModal } = useAlert();
 */
export function useAlert() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AlertOptions>({ title: "" });

  const alert = useCallback((options: AlertOptions) => {
    setOpts(options);
    setOpen(true);
  }, []);

  const isError = opts.tone !== "info";
  const Icon = isError ? AlertCircle : Info;

  const alertModal = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-5 w-5" />
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
          <AlertDialogAction onClick={() => setOpen(false)}>{opts.actionText ?? "Entendido"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { alert, alertModal };
}