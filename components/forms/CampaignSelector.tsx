"use client";

import { useState, useTransition } from "react";
import { Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { saveSelectedCampaign } from "@/app/actions/pixel";
import { toast } from "sonner";

type Campaign = {
  id: string;
  name: string;
  status: string;
};

type Props = {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
};

export function CampaignSelector({ campaigns, selectedCampaignId }: Props) {
  const [value, setValue] = useState(selectedCampaignId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveSelectedCampaign(value || null);
      if (result.success) {
        toast.success(value ? "Campanha selecionada" : "Campanha desvinculada");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (campaigns.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        Nenhuma campanha encontrada. Verifique o Ad Account ID e Token acima.
      </p>
    );
  }

  const options = [
    { value: "", label: "Nenhuma (mostrar todas)" },
    ...campaigns.map((c) => ({
      value: c.id,
      label: `${c.name}`,
      icon:
        c.status === "ACTIVE" ? (
          <Zap className="h-3 w-3 text-emerald-500" />
        ) : (
          <ZapOff className="h-3 w-3 text-slate-400" />
        ),
    })),
  ];

  return (
    <div className="space-y-3">
      <CustomSelect
        options={options}
        value={value}
        onChange={setValue}
        placeholder="Selecione a campanha principal"
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={isPending} className="rounded-xl">
          {isPending ? "Salvando..." : "Salvar Campanha"}
        </Button>
        {value && (
          <p className="text-xs text-slate-400">
            ID: <span className="font-mono text-slate-600">{value}</span>
          </p>
        )}
      </div>
      <p className="text-xs text-slate-400">
        A campanha selecionada será usada nas abas Meta e Analytics para exibir insights e gerenciar
        criativos.
      </p>
    </div>
  );
}
