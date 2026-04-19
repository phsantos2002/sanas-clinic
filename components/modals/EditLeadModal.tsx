"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLead } from "@/app/actions/leads";
import { toast } from "sonner";
import { User, Phone, Mail, FileText, MapPin, StickyNote } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import type { LeadDetail } from "@/types";
import type { Stage } from "@/types";

type Props = {
  lead: LeadDetail | null;
  stages: Stage[];
  open: boolean;
  onClose: () => void;
};

export function EditLeadModal({ lead, stages, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [stageId, setStageId] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setPhone(lead.phone);
      setEmail(lead.email ?? "");
      setCpf(lead.cpf ?? "");
      setAddress(lead.address ?? "");
      setCity(lead.city ?? "");
      setNotes(lead.notes ?? "");
      setStageId(lead.stageId ?? "");
      setAiEnabled(lead.aiEnabled);
    }
  }, [lead]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead) return;

    setLoading(true);
    const result = await updateLead(lead.id, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      cpf: cpf.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      notes: notes.trim() || null,
      stageId: stageId || null,
      aiEnabled,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Lead atualizado com sucesso");
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Editar Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                Nome
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3.5 w-3.5 text-indigo-500" />
                Telefone
              </Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cpf" className="flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                CPF
              </Label>
              <Input
                id="edit-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-address" className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                Endereço
              </Label>
              <Input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-city" className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                Cidade
              </Label>
              <Input
                id="edit-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade - UF"
              />
            </div>
          </div>

          {/* Stage */}
          <div className="space-y-1.5">
            <Label className="text-xs">Etapa do Pipeline</Label>
            <CustomSelect
              options={[
                { value: "", label: "Sem etapa" },
                ...stages.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={stageId}
              onChange={setStageId}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="flex items-center gap-1.5 text-xs">
              <StickyNote className="h-3.5 w-3.5 text-indigo-500" />
              Observações
            </Label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anotações sobre o lead..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 resize-none"
            />
          </div>

          {/* AI toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">IA Ativa</p>
              <p className="text-xs text-slate-400">IA responde automaticamente no WhatsApp</p>
            </div>
            <button
              type="button"
              onClick={() => setAiEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                aiEnabled ? "bg-indigo-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
                  aiEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
