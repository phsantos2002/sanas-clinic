"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "destructive" | "default";
  requireConfirmText?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  confirmVariant = "destructive",
  requireConfirmText,
  onConfirm,
}: Props) {
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = requireConfirmText ? confirmInput === requireConfirmText : true;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setConfirmInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireConfirmText && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Digite{" "}
              <span className="font-mono font-bold text-slate-700">{requireConfirmText}</span> para
              confirmar:
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-red-300"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={confirmVariant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
