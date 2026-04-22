"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CsvImportClient } from "@/components/prospeccao/CsvImportClient";

type Attendant = { id: string; name: string; role: string };
type Stage = { id: string; name: string };

type Props = {
  stage: { id: string; name: string };
  attendants: Attendant[];
  stages: Stage[];
};

export function KanbanColumnImportButton({ stage, attendants, stages }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Importar CSV para "${stage.name}"`}
        className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-colors"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">
              Importar leads para &ldquo;{stage.name}&rdquo;
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Os leads importados entrarão direto nesta coluna e o evento do Pixel da coluna será
              disparado para cada lead criado.
            </p>
          </DialogHeader>
          <CsvImportClient
            attendants={attendants}
            stages={stages}
            lockedStage={stage}
            onDone={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
